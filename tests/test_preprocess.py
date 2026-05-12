from email_analyzer.preprocess import (
    clean_email_body,
    join_corpus,
    normalise,
    strip_html,
    strip_quoted_replies,
    tokenise,
)


def test_strip_html_removes_tags_and_decodes_entities() -> None:
    html = "<p>Hello&nbsp;<b>world</b>&amp;more</p><script>bad()</script>"
    out = strip_html(html)
    assert "<" not in out
    assert "bad()" not in out
    assert "world" in out
    assert "&amp;" not in out


def test_strip_html_handles_empty() -> None:
    assert strip_html("") == ""


def test_strip_quoted_replies_removes_quoted_block() -> None:
    text = "My answer is yes.\nOn Mon, 6 Jan 2026, Alice wrote:\n> earlier message body"
    cleaned = strip_quoted_replies(text)
    assert "My answer is yes" in cleaned
    assert "earlier message body" not in cleaned


def test_normalise_lowercases_and_strips_urls() -> None:
    text = "Visit https://example.com or email me@x.com NOW! Cost: $42"
    out = normalise(text)
    assert "https" not in out
    assert "me@x.com" not in out
    assert "42" not in out
    assert "visit" in out
    assert "now" in out


def test_tokenise_drops_stopwords_and_short_tokens() -> None:
    text = normalise("The quick brown fox jumps over the lazy dog and an old cat")
    tokens = tokenise(text)
    assert "the" not in tokens
    assert "an" not in tokens
    assert "quick" in tokens
    assert "brown" in tokens


def test_tokenise_drops_email_boilerplate() -> None:
    text = normalise("Please click here to unsubscribe from our weekly newsletter")
    tokens = tokenise(text)
    assert "click" not in tokens
    assert "unsubscribe" not in tokens
    assert "weekly" in tokens
    assert "newsletter" in tokens


def test_clean_email_body_html_pipeline() -> None:
    html = "<html><body><p>The <b>project</b> deadline is Friday.</p></body></html>"
    out = clean_email_body(html, content_type="text/html")
    assert "project" in out
    assert "deadline" in out
    assert "<" not in out


def test_clean_email_body_plain_pipeline() -> None:
    out = clean_email_body("Meeting at 10am tomorrow!", content_type="text/plain")
    assert "meeting" in out
    assert "10am" not in out  # digits stripped


def test_clean_email_body_empty_returns_empty() -> None:
    assert clean_email_body("") == ""


def test_join_corpus_filters_empty() -> None:
    assert join_corpus(["a", "", "b", None]) == "a b"  # type: ignore[list-item]
