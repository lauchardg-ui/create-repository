from email_analyzer.topics import Topic, discover_topics, topic_prevalence


def test_discover_topics_returns_empty_for_tiny_corpus() -> None:
    result = discover_topics(["short doc"], n_topics=5)
    assert result.topics == []
    assert result.document_topic_matrix.size == 0


def test_discover_topics_runs_on_reasonable_corpus() -> None:
    docs = [
        "project meeting deadline sprint roadmap milestone",
        "project sprint deadline kickoff team standup",
        "invoice payment subscription billing receipt",
        "invoice billing payment refund statement",
        "flight hotel itinerary booking departure",
        "flight booking hotel reservation arrival",
        "newsletter weekly digest subscribe issue",
        "newsletter digest issue subscribe weekly",
    ]
    result = discover_topics(docs, n_topics=4, n_top_terms=5)
    assert len(result.topics) == 4
    assert all(len(t.top_terms) <= 5 for t in result.topics)
    # Document-topic matrix rows sum to ~1.
    sums = result.document_topic_matrix.sum(axis=1)
    assert all(abs(s - 1.0) < 1e-3 for s in sums)


def test_topic_prevalence_sums_to_one() -> None:
    docs = ["project meeting deadline"] * 4 + ["invoice payment refund"] * 4
    result = discover_topics(docs, n_topics=2)
    prevalence = topic_prevalence(result)
    assert pytest_approx_sum_to_one(prevalence)


def test_topic_prevalence_empty_when_no_topics() -> None:
    result = discover_topics(["a"], n_topics=2)
    assert topic_prevalence(result) == {}


def test_topic_label_falls_back_to_index() -> None:
    t = Topic(index=3, top_terms=[])
    assert t.label == "Topic 3"


def pytest_approx_sum_to_one(prevalence: dict[str, float]) -> bool:
    return abs(sum(prevalence.values()) - 1.0) < 1e-3
