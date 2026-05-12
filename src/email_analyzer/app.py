"""Streamlit dashboard entry point.

Run with::

    streamlit run src/email_analyzer/app.py
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd
import streamlit as st

from email_analyzer import __version__
from email_analyzer.analysis import AnalysisResult, analyse
from email_analyzer.gmail_client import (
    GmailAuthError,
    GmailClient,
    build_service,
    load_credentials,
)
from email_analyzer.visualizations import (
    theme_bar_chart,
    theme_keyword_treemap,
    theme_sunburst,
    theme_timeseries,
    topic_bar,
    topic_term_heatmap,
    wordcloud_png,
)

DEFAULT_THEMES = Path("config/themes.yaml")


def _sidebar() -> dict[str, object]:
    st.sidebar.header("Settings")
    st.sidebar.caption(f"v{__version__}")
    query = st.sidebar.text_input(
        "Gmail search query",
        value="newer_than:90d",
        help="Standard Gmail search syntax (e.g. 'from:boss newer_than:30d').",
    )
    max_results = st.sidebar.slider("Max emails to analyse", 50, 1000, 200, step=50)
    n_topics = st.sidebar.slider("Auto-discovered topics", 3, 12, 6)
    freq_label = st.sidebar.selectbox("Time-series bucket", ["Weekly", "Monthly", "Daily"], index=0)
    freq = {"Daily": "D", "Weekly": "W", "Monthly": "M"}[freq_label]
    themes_path = st.sidebar.text_input("Themes config path", value=str(DEFAULT_THEMES))
    return {
        "query": query,
        "max_results": int(max_results),
        "n_topics": int(n_topics),
        "freq": freq,
        "themes_path": themes_path,
    }


@st.cache_resource(show_spinner=False)
def _client() -> GmailClient:
    creds = load_credentials()
    return GmailClient(service=build_service(creds))


def _fetch_and_analyse(
    query: str, max_results: int, n_topics: int, themes_path: str
) -> AnalysisResult | None:
    client = _client()
    with st.spinner(f"Fetching up to {max_results} messages..."):
        messages = client.fetch_messages(query=query, max_results=max_results)
    if not messages:
        return None
    with st.spinner("Analysing themes and discovering topics..."):
        return analyse(messages, themes_path=themes_path, n_topics=n_topics)


def main() -> None:
    st.set_page_config(
        page_title="Email Theme Analyzer",
        page_icon=":bar_chart:",
        layout="wide",
    )
    st.title("Email Theme Analyzer")
    st.caption("Count thematic mentions in your inbox and discover hidden topics.")

    settings = _sidebar()
    run = st.sidebar.button("Analyse my inbox", type="primary", use_container_width=True)

    if not run:
        st.info(
            "Configure your run in the sidebar and click **Analyse my inbox**. "
            "First-time auth opens a browser for Google sign-in."
        )
        return

    try:
        analysis = _fetch_and_analyse(
            query=str(settings["query"]),
            max_results=int(settings["max_results"]),  # type: ignore[call-overload]
            n_topics=int(settings["n_topics"]),  # type: ignore[call-overload]
            themes_path=str(settings["themes_path"]),
        )
    except GmailAuthError as exc:
        st.error(f"Authentication failed: {exc}")
        return
    except FileNotFoundError as exc:
        st.error(f"Theme file missing: {exc}")
        return

    if analysis is None or analysis.n_messages == 0:
        st.warning("No messages matched your query.")
        return

    col_a, col_b, col_c = st.columns(3)
    col_a.metric("Emails analysed", analysis.n_messages)
    col_b.metric("Themes matched", sum(1 for v in analysis.theme_result.theme_totals.values() if v))
    col_c.metric("Total mentions", int(sum(analysis.theme_result.theme_totals.values())))

    st.subheader("Theme overview")
    st.plotly_chart(theme_bar_chart(analysis.theme_result), use_container_width=True)

    tab_tree, tab_sun, tab_cloud = st.tabs(["Treemap", "Sunburst", "Word cloud"])
    with tab_tree:
        st.plotly_chart(theme_keyword_treemap(analysis.theme_result), use_container_width=True)
    with tab_sun:
        st.plotly_chart(theme_sunburst(analysis.theme_result), use_container_width=True)
    with tab_cloud:
        st.image(wordcloud_png(analysis.theme_result), use_column_width=True)

    st.subheader("Mentions over time")
    valid_ts = [t for t in analysis.timestamps if t is not None]
    valid_counters = [
        c
        for t, c in zip(analysis.timestamps, analysis.per_document_theme_counts, strict=False)
        if t is not None
    ]
    st.plotly_chart(
        theme_timeseries(valid_ts, valid_counters, freq=str(settings["freq"])),
        use_container_width=True,
    )

    st.subheader("Auto-discovered topics")
    col_l, col_r = st.columns([1, 2])
    with col_l:
        st.plotly_chart(topic_bar(analysis.topic_prevalence), use_container_width=True)
    with col_r:
        st.plotly_chart(topic_term_heatmap(analysis.topic_result), use_container_width=True)

    with st.expander("Raw keyword counts (download as CSV)"):
        df = pd.DataFrame(analysis.theme_result.as_records()).sort_values(
            ["theme", "count"], ascending=[True, False]
        )
        st.dataframe(df, use_container_width=True)
        st.download_button(
            "Download CSV",
            data=df.to_csv(index=False).encode("utf-8"),
            file_name="theme_keyword_counts.csv",
            mime="text/csv",
        )


if __name__ == "__main__":
    main()
