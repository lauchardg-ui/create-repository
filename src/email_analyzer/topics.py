"""Auto-discovered topic modelling via LDA (scikit-learn).

The output is a list of Topic objects, each carrying its top weighted terms and the
per-document mixture weights.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from sklearn.decomposition import LatentDirichletAllocation
from sklearn.feature_extraction.text import CountVectorizer

from email_analyzer.preprocess import EMAIL_BOILERPLATE, STOPWORDS


@dataclass(frozen=True)
class Topic:
    """A single auto-discovered topic."""

    index: int
    top_terms: list[tuple[str, float]]

    @property
    def label(self) -> str:
        """A short human label built from the top terms."""
        return ", ".join(term for term, _ in self.top_terms[:3]) or f"Topic {self.index}"


@dataclass(frozen=True)
class TopicModelResult:
    """Trained LDA model output."""

    topics: list[Topic]
    document_topic_matrix: np.ndarray  # shape (n_docs, n_topics)
    vocabulary: list[str]


def discover_topics(
    documents: list[str],
    *,
    n_topics: int = 6,
    n_top_terms: int = 10,
    max_features: int = 2000,
    min_df: int = 2,
    max_df: float = 0.95,
    random_state: int = 42,
) -> TopicModelResult:
    """Fit LDA on the corpus and return the top terms for each topic.

    Returns an empty result if the corpus is too small or sparse to fit.
    """
    docs = [d for d in documents if d and d.strip()]
    if len(docs) < max(2, n_topics):
        return TopicModelResult(topics=[], document_topic_matrix=np.empty((0, 0)), vocabulary=[])

    stop_words = list(STOPWORDS | EMAIL_BOILERPLATE)
    # CountVectorizer raises if min_df > number of docs; guard against tiny corpora.
    effective_min_df = min(min_df, max(1, len(docs) - 1))
    vectoriser = CountVectorizer(
        max_features=max_features,
        min_df=effective_min_df,
        max_df=max_df,
        stop_words=stop_words,
        token_pattern=r"(?u)\b[a-z][a-z]+\b",  # noqa: S106  # nosec B106
    )
    try:
        dtm = vectoriser.fit_transform(docs)
    except ValueError:
        # Happens when vocabulary is empty after pruning.
        return TopicModelResult(topics=[], document_topic_matrix=np.empty((0, 0)), vocabulary=[])

    if dtm.shape[1] == 0:
        return TopicModelResult(topics=[], document_topic_matrix=np.empty((0, 0)), vocabulary=[])

    effective_n_topics = min(n_topics, dtm.shape[0], dtm.shape[1])
    lda = LatentDirichletAllocation(
        n_components=effective_n_topics,
        random_state=random_state,
        learning_method="batch",
        max_iter=25,
    )
    doc_topic = lda.fit_transform(dtm)
    vocab = vectoriser.get_feature_names_out().tolist()

    topics: list[Topic] = []
    for idx, component in enumerate(lda.components_):
        # Normalise the topic-word distribution so weights sum to 1.
        weights = component / component.sum()
        top_indices = weights.argsort()[::-1][:n_top_terms]
        top_terms = [(vocab[i], float(weights[i])) for i in top_indices]
        topics.append(Topic(index=idx, top_terms=top_terms))

    return TopicModelResult(
        topics=topics,
        document_topic_matrix=doc_topic,
        vocabulary=vocab,
    )


def topic_prevalence(result: TopicModelResult) -> dict[str, float]:
    """Average per-document weight for each topic (sums to 1)."""
    if result.document_topic_matrix.size == 0:
        return {}
    mean_weights = result.document_topic_matrix.mean(axis=0)
    return {topic.label: float(mean_weights[topic.index]) for topic in result.topics}
