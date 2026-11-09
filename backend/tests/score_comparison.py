"""
Compare single-prompt scoring with verify-then-score on ten fixed answers, then
make one call each to generate_question and generate_debrief to check their output shape.

Run from the backend directory:

    python -m tests.score_comparison             # live, needs GROQ_API_KEY in backend/.env
    python -m tests.score_comparison --pace 30   # live, waiting 30s before each case to stay under a tokens-per-minute limit
    python -m tests.score_comparison --offline   # no network, checks fallback and JSON handling
"""
import asyncio
import json
import logging
import statistics
import sys
import time

from app.services import gemini

CASES = [
    {
        "kind": "strong correct",
        "question": "What is a deadlock in an operating system, and what conditions must hold for one to occur?",
        "topic": "Operating Systems",
        "expected_keywords": ["mutual exclusion", "hold and wait", "no preemption", "circular wait"],
        "ideal_answer_hint": "Define deadlock and name the four Coffman conditions, with one way to prevent or avoid it.",
        "context_chunks": ["Deadlocks: necessary conditions, resource allocation graph, prevention, avoidance with Banker's algorithm, detection and recovery."],
        "answer": (
            "A deadlock is a state where a set of processes are all blocked because each one holds a resource and waits "
            "for a resource held by another process in the set, so none of them can ever proceed. Four conditions must "
            "hold together: mutual exclusion, where a resource can be used by only one process at a time; hold and wait, "
            "where a process keeps the resources it has while requesting more; no preemption, where a resource cannot be "
            "taken away forcibly; and circular wait, where there is a cycle of processes each waiting on the next. "
            "Breaking any one of them prevents deadlock, for example ordering all locks globally removes circular wait, "
            "and the Banker's algorithm avoids deadlock by only granting requests that keep the system in a safe state."
        ),
    },
    {
        "kind": "strong correct",
        "question": "Explain how a B+ tree index speeds up queries in a relational database.",
        "topic": "Database Management Systems",
        "expected_keywords": ["balanced", "leaf nodes", "range query", "logarithmic"],
        "ideal_answer_hint": "Balanced tree with data pointers only in linked leaves, logarithmic lookups and efficient range scans.",
        "context_chunks": ["Indexing: ordered indices, B+ tree index files, insertion and deletion, hashing, comparison of ordered indexing and hashing."],
        "answer": (
            "A B+ tree is a balanced multi-way search tree, so every leaf is at the same depth and a lookup costs "
            "O(log n) page reads instead of scanning the whole table. Internal nodes hold only keys that guide the "
            "search, while the leaf nodes hold the keys with pointers to the rows. Because each node has a high fan-out, "
            "the tree stays very shallow even for millions of rows. The leaves are also linked together in key order, "
            "so a range query finds the first matching key and then walks the leaf chain sequentially. Inserts and "
            "deletes keep the tree balanced by splitting or merging nodes."
        ),
    },
    {
        "kind": "fluent but wrong",
        "question": "Explain the difference between TCP and UDP and when you would choose each.",
        "topic": "Computer Networks",
        "expected_keywords": ["connection-oriented", "reliable", "ordering", "low latency"],
        "ideal_answer_hint": "TCP is connection-oriented, reliable and ordered; UDP is connectionless and unreliable but low overhead, suited to real-time traffic.",
        "context_chunks": ["Transport layer: UDP, TCP segment structure, connection management, flow control, congestion control."],
        "answer": (
            "TCP and UDP are both transport layer protocols, and the key difference is that UDP is the connection-oriented "
            "one. UDP performs a three-way handshake before any data is sent and then guarantees that every packet "
            "arrives in order by retransmitting lost segments, which is why it is used for file transfers and web pages. "
            "TCP, on the other hand, is connectionless: it simply fires datagrams at the receiver with no "
            "acknowledgements, no ordering and no congestion control, which makes it much faster. That is why video "
            "calls and online games are built on TCP, while banking systems rely on UDP for its reliability. In "
            "practice you choose UDP when correctness matters and TCP when speed matters."
        ),
    },
    {
        "kind": "fluent but wrong",
        "question": "What is the time complexity of binary search, and what does the algorithm require of its input?",
        "topic": "Data Structures and Algorithms",
        "expected_keywords": ["O(log n)", "sorted", "halving", "random access"],
        "ideal_answer_hint": "O(log n) time by halving the search range each step; requires sorted input with random access.",
        "context_chunks": ["Searching: linear search, binary search, analysis of time complexity, searching in sorted arrays."],
        "answer": (
            "Binary search is one of the most elegant algorithms in computer science, and its time complexity is O(n^2) "
            "because it has to compare every element with every other element in the worst case. One of its biggest "
            "advantages is that it works on any unsorted array or linked list, since it does not depend on the order of "
            "the elements at all. The algorithm works by starting at the first element and moving forward one position "
            "at a time until it finds the target. Because of this it is generally slower than linear search, which runs "
            "in O(log n). It is typically implemented with a hash function to pick the middle element."
        ),
    },
    {
        "kind": "short but correct",
        "question": "What is a primary key in a relational database?",
        "topic": "Database Management Systems",
        "expected_keywords": ["unique", "not null", "identifies a row"],
        "ideal_answer_hint": "A column or set of columns that uniquely identifies each row; values are unique and cannot be null.",
        "context_chunks": ["Relational model: keys, super key, candidate key, primary key, foreign key, integrity constraints."],
        "answer": "A column or set of columns that uniquely identifies each row. It must be unique and cannot be null.",
    },
    {
        "kind": "short but correct",
        "question": "What is the difference between a process and a thread?",
        "topic": "Operating Systems",
        "expected_keywords": ["address space", "shared memory", "lightweight", "context switch"],
        "ideal_answer_hint": "A process has its own address space; threads share the process's memory and are cheaper to create and switch.",
        "context_chunks": ["Processes and threads: process control block, context switching, multithreading models, user and kernel threads."],
        "answer": "A process has its own address space. Threads live inside a process and share its memory, so they are cheaper to create and switch between.",
    },
    {
        "kind": "off-topic or empty-ish",
        "question": "Explain how virtual memory works and what a page fault is.",
        "topic": "Operating Systems",
        "expected_keywords": ["paging", "page table", "page fault", "swap"],
        "ideal_answer_hint": "Virtual addresses are mapped to physical frames through page tables; a page fault loads a missing page from disk.",
        "context_chunks": ["Memory management: paging, segmentation, virtual memory, demand paging, page replacement algorithms."],
        "answer": (
            "I really enjoy working in teams and I think communication is the most important skill for any engineer. "
            "In my last college project I was the team lead and I made sure everyone met their deadlines. I am a quick "
            "learner and I am very passionate about technology and innovation."
        ),
    },
    {
        "kind": "off-topic or empty-ish",
        "question": "What is normalization in databases, and why is it used?",
        "topic": "Database Management Systems",
        "expected_keywords": ["redundancy", "anomalies", "normal forms", "functional dependency"],
        "ideal_answer_hint": "Organising tables to reduce redundancy and update anomalies using normal forms based on functional dependencies.",
        "context_chunks": ["Normalization: functional dependencies, 1NF, 2NF, 3NF, BCNF, decomposition."],
        "answer": "I am not sure about this one, I think it is something about databases.",
    },
    {
        "kind": "mostly right, one critical error",
        "question": "Describe how a TCP connection is established and how it is closed.",
        "topic": "Computer Networks",
        "expected_keywords": ["three-way handshake", "SYN", "ACK", "four-way termination", "FIN"],
        "ideal_answer_hint": "Three-way handshake (SYN, SYN-ACK, ACK) to open; four-segment FIN/ACK exchange to close, with each direction closed separately.",
        "context_chunks": ["Transport layer: UDP, TCP segment structure, connection management, flow control, congestion control."],
        "answer": (
            "TCP is connection-oriented, so both sides must agree on initial sequence numbers before data flows. The "
            "client sends a SYN carrying its initial sequence number, the server replies with a SYN-ACK that "
            "acknowledges it and carries the server's own sequence number, and the client completes setup with an ACK. "
            "After that, data is exchanged reliably using sequence numbers, acknowledgements and retransmission. To "
            "close the connection, TCP uses the same three-way handshake again: the side that wants to close sends a "
            "SYN, the other side answers with a SYN-ACK and the first side sends a final ACK, after which both sides "
            "release the connection at the same moment. No FIN segments are involved in closing."
        ),
    },
    {
        "kind": "buzzwords used wrongly",
        "question": "Explain the ACID properties of database transactions.",
        "topic": "Database Management Systems",
        "expected_keywords": ["atomicity", "consistency", "isolation", "durability"],
        "ideal_answer_hint": "Atomicity (all or nothing), consistency (constraints preserved), isolation (concurrent transactions do not interfere), durability (committed changes survive crashes).",
        "context_chunks": ["Transactions: ACID properties, serializability, concurrency control, locking protocols, recovery and logging."],
        "answer": (
            "ACID is the foundation of every reliable database system and stands for atomicity, consistency, isolation "
            "and durability. Atomicity means every value stored in a column must be atomic, that is, indivisible, which "
            "is exactly what first normal form enforces. Consistency means that all replicas in a distributed cluster "
            "return the same data at the same time, which is the C in the CAP theorem. Isolation means the database "
            "server is isolated from the public network behind a firewall, so that only authorised transactions can "
            "reach it. Durability refers to how long the hardware lasts, which is why enterprises use RAID arrays and "
            "SSDs with high write endurance. Together these properties guarantee that write-ahead logging and two-phase "
            "locking deliver high throughput at scale."
        ),
    },
]

# Kinds where the answer is fluent but technically wrong in whole or in part.
WRONG_KINDS = ("fluent but wrong", "mostly right, one critical error", "buzzwords used wrongly")


def _fields(case: dict) -> dict:
    return {k: case[k] for k in ("question", "answer", "topic", "expected_keywords", "ideal_answer_hint")}


def _claims_cell(result: dict) -> str:
    if "claims" not in result:
        return "(fallback path, no claims)"
    if not result["claims"]:
        return "(no claims)"
    return "<br>".join(
        f"{c['verdict']}{' (critical)' if c.get('critical') else ''}: {c['claim']}" for c in result["claims"]
    )


def _timed(name: str, timings: dict):
    """Wrap a gemini function so each call's duration is recorded under its name."""
    original = getattr(gemini, name)

    def wrapper(*args, **kwargs):
        t = time.perf_counter()
        try:
            return original(*args, **kwargs)
        finally:
            timings.setdefault(name, []).append(time.perf_counter() - t)

    setattr(gemini, name, wrapper)


def check_other_functions() -> bool:
    """One call each to the other LLM functions, checking the shape the frontend reads."""
    ok = True

    q = asyncio.run(gemini.generate_question(
        topic="Operating Systems",
        interview_type="technical",
        target_company="faang",
        difficulty=6,
        previous_questions=[CASES[0]["question"]],
        rag_context=[{"text": CASES[0]["context_chunks"][0]}],
    ))
    shape_ok = (
        isinstance(q, dict)
        and isinstance(q.get("question"), str) and q["question"].strip() != ""
        and isinstance(q.get("topic_tag"), str)
        and isinstance(q.get("expected_keywords"), list) and all(isinstance(k, str) for k in q["expected_keywords"])
        and isinstance(q.get("ideal_answer_hint"), str)
    )
    extra = sorted(set(q) - {"question", "topic_tag", "expected_keywords", "ideal_answer_hint"}) if isinstance(q, dict) else []
    print(f"generate_question: shape {'ok' if shape_ok else 'WRONG'}, keys {sorted(q) if isinstance(q, dict) else type(q)}, extra keys {extra}")
    print(f"  question: {q.get('question', '')[:160] if isinstance(q, dict) else q}")
    ok &= shape_ok

    debrief = asyncio.run(gemini.generate_debrief(
        questions=[
            {"question": c["question"], "topic": c["topic"], "score": score, "weak_areas": [c["topic"]] if score < 5 else []}
            for c, score in zip(CASES[:8], [9.0, 9.0, 2.0, 1.5, 8.0, 8.5, 1.0, 1.0])
        ],
        overall_score=5.0,
        interview_type="technical",
        target_company="faang",
    ))
    sentences = [x for x in debrief.replace("?", ".").replace("!", ".").split(".") if x.strip()] if isinstance(debrief, str) else []
    plain = isinstance(debrief, str) and debrief.strip() != "" and not debrief.lstrip().startswith(("{", "#", "-", "*"))
    complete = plain and debrief.rstrip()[-1] in ".!?\"'"
    print(f"generate_debrief: plain text {'ok' if plain else 'WRONG'}, ends on a full sentence {'yes' if complete else 'NO'}, about {len(sentences)} sentences, {len(debrief)} chars")
    print(f"  debrief: {debrief}")
    ok &= plain and complete
    return ok


class _RateLimitCounter(logging.Handler):
    """Counts 429 replies from the LLM provider, which the client retries after a wait."""

    def __init__(self):
        super().__init__()
        self.count = 0

    def emit(self, record):
        if " 429 " in record.getMessage():
            self.count += 1


def run_live(pace: float = 0.0) -> int:
    limited = _RateLimitCounter()
    httpx_log = logging.getLogger("httpx")
    httpx_log.setLevel(logging.INFO)
    httpx_log.addHandler(limited)

    timings: dict = {}
    _timed("verify_claims", timings)
    _timed("score_from_claims", timings)

    rows, old_times, new_times = [], [], []
    for i, case in enumerate(CASES, 1):
        if pace:
            time.sleep(pace)
        t = time.perf_counter()
        old = gemini.score_single_prompt(**_fields(case))
        old_times.append(time.perf_counter() - t)

        t = time.perf_counter()
        new = asyncio.run(gemini.score_answer(**_fields(case), context_chunks=case["context_chunks"]))
        new_times.append(time.perf_counter() - t)

        has_critical = any(c.get("critical") for c in new.get("claims", []))
        rows.append((i, case["kind"], old["score"], new["score"], _claims_cell(new), "claims" not in new, has_critical))

    print("\n| # | Kind | Old score | New score | Claims |")
    print("|---|---|---|---|---|")
    for row in rows:
        print("| " + " | ".join(str(x) for x in row[:5]) + " |")

    fallbacks = sum(1 for r in rows if r[5])
    new_median = statistics.median(new_times)
    print(f"\nMedian latency: old {statistics.median(old_times):.2f}s, new {new_median:.2f}s")
    print("Per-step median: " + ", ".join(f"{name} {statistics.median(v):.2f}s" for name, v in timings.items()))
    print(f"Fallback path used on {fallbacks} of {len(rows)} cases")
    print(f"Provider rate-limit replies (429) during the run: {limited.count}")

    fully_wrong = [r for r in rows if r[1] == "fluent but wrong"]
    harder = [r for r in rows if r[1] in WRONG_KINDS and r[1] != "fluent but wrong"]
    good = [r for r in rows if r[1] in ("strong correct", "short but correct")]
    low_ok = all(r[3] <= 4.0 for r in fully_wrong)
    harder_ok = all(r[3] <= 4.0 for r in harder if r[6])
    good_ok = all(r[3] >= 6.0 for r in good)
    print("Fully wrong answers score 4.0 or below under the new path:", "yes" if low_ok else "NO")
    print("Harder cases score 4.0 or below when a critical incorrect claim is flagged:", "yes" if harder_ok else "NO",
          "(" + ", ".join(f"#{r[0]} old {r[2]} new {r[3]}, critical {'flagged' if r[6] else 'not flagged'}" for r in harder) + ")")
    print("Note: the old single-prompt score varies between runs, so old and new are shown for reference only.")
    print("Correct answers stay at 6.0 or above under the new path:", "yes" if good_ok else "NO")

    print()
    if pace:
        time.sleep(pace)
    others_ok = check_other_functions()
    return 0 if (fallbacks == 0 and low_ok and harder_ok and good_ok and others_ok) else 1


def run_offline() -> int:
    """Replace the LLM call with canned replies and check the chain's control flow."""
    case = CASES[2]
    good_claims = json.dumps({"claims": [
        {"claim": "UDP is connection-oriented", "verdict": "incorrect", "reason": "UDP is connectionless"},
        {"claim": "TCP has no acknowledgements", "verdict": "INCORRECT", "reason": "TCP acknowledges segments"},
        {"claim": "Both are transport layer protocols", "verdict": "correct", "reason": "true"},
    ]})
    score_json = json.dumps({"score": 8.5, "hint": "h", "ideal_answer": "i", "weak_areas": ["w"]})
    checks = []

    def scenario(name, replies, expect):
        queue = list(replies)
        calls = []

        def fake(prompt, temperature=0.7, max_tokens=1024, timeout=None):
            calls.append(prompt)
            reply = queue.pop(0)
            if isinstance(reply, Exception):
                raise reply
            return reply

        original = gemini.call_llm
        gemini.call_llm = fake
        try:
            result = asyncio.run(gemini.score_answer(**_fields(case), context_chunks=case["context_chunks"]))
        finally:
            gemini.call_llm = original
        ok = expect(result, calls)
        checks.append(ok)
        print(f"{'PASS' if ok else 'FAIL'}  {name}")

    required = {"score", "hint", "ideal_answer", "weak_areas"}
    scenario("two-step path keeps existing fields and adds claims",
             [good_claims, score_json],
             lambda r, c: required <= set(r) and len(r["claims"]) == 3 and len(c) == 2)
    scenario("mostly wrong claims cap an inflated score at 4.0",
             [good_claims, score_json],
             lambda r, c: r["score"] == 4.0)
    scenario("code fences are stripped",
             ["```json\n" + good_claims + "\n```", "Here you go:\n```\n" + score_json + "\n```"],
             lambda r, c: "claims" in r and r["score"] == 4.0)
    scenario("invalid JSON in step 1 is retried once",
             ["not json", good_claims, score_json],
             lambda r, c: "claims" in r and len(c) == 3)
    scenario("invalid JSON twice in step 1 falls back to single prompt",
             ["not json", "still not json", score_json],
             lambda r, c: "claims" not in r and r["score"] == 8.5 and len(c) == 3)
    scenario("timeout in step 1 falls back to single prompt",
             [TimeoutError("timed out"), score_json],
             lambda r, c: "claims" not in r and required <= set(r))
    scenario("failure in step 2 falls back to single prompt",
             [good_claims, "not json", "not json", score_json],
             lambda r, c: "claims" not in r and r["score"] == 8.5)
    scenario("no correct claims caps the score at 2.0",
             [json.dumps({"claims": []}), score_json],
             lambda r, c: r["score"] == 2.0 and r["claims"] == [])

    def claims_reply(wrong_claim_extra: dict) -> str:
        return json.dumps({"claims": [
            {"claim": "SYN starts the handshake", "verdict": "correct", "reason": "true"},
            {"claim": "SYN-ACK is the reply", "verdict": "correct", "reason": "true"},
            {"claim": "ACK completes setup", "verdict": "correct", "reason": "true"},
            {"claim": "Sequence numbers give reliability", "verdict": "correct", "reason": "true"},
            {"claim": "Closing reuses the SYN handshake", "verdict": "incorrect", "reason": "closing uses FIN", **wrong_claim_extra},
        ]})

    scenario("one critical incorrect claim among correct ones caps an inflated score at 4.0",
             [claims_reply({"critical": True, "confidence": "high"}), score_json],
             lambda r, c: r["score"] == 4.0 and [x["critical"] for x in r["claims"]] == [False, False, False, False, True])
    scenario("a low-confidence critical flag does not cap",
             [claims_reply({"critical": True, "confidence": "low"}), score_json],
             lambda r, c: r["score"] == 8.5 and r["claims"][-1]["critical"] is True)
    scenario("a critical flag with no confidence does not cap",
             [claims_reply({"critical": True}), score_json],
             lambda r, c: r["score"] == 8.5)
    scenario("a correct answer that contradicts a wrong hint scores above 4.0",
             [json.dumps({"claims": [
                 {"claim": "The language is regular", "verdict": "correct", "confidence": "high", "reason": "a DFA can track the first and last symbol"},
                 {"claim": "A DFA tracks whether first and last symbols match", "verdict": "correct", "confidence": "high", "reason": "true"}]}), score_json],
             lambda r, c: r["score"] > 4.0 and "may be wrong" in c[0])
    scenario("a non-critical incorrect claim does not trigger the cap",
             [claims_reply({"critical": False}), score_json],
             lambda r, c: r["score"] == 8.5 and not any(x["critical"] for x in r["claims"]))
    scenario("a reply without the critical field still parses and is not capped",
             [claims_reply({}), score_json],
             lambda r, c: r["score"] == 8.5 and all(x["critical"] is False for x in r["claims"]))
    scenario("critical is ignored on a claim that is not incorrect",
             [json.dumps({"claims": [{"claim": "SYN starts the handshake", "verdict": "correct", "critical": True, "reason": "true"}]}), score_json],
             lambda r, c: r["score"] == 8.5 and r["claims"][0]["critical"] is False)

    scenario("the scoring prompt carries the score band anchors",
             [good_claims, score_json],
             lambda r, c: "8 to 9: all claims correct" in c[1] and "Under 4: the core idea is wrong" in c[1])
    scenario("caps still apply to a high model score under the anchors",
             [claims_reply({"critical": True, "confidence": "high"}), json.dumps({"score": 9.5, "hint": "h", "ideal_answer": "i", "weak_areas": []})],
             lambda r, c: r["score"] == 4.0)

    short = asyncio.run(gemini.score_answer(**{**_fields(case), "answer": "idk"}))
    ok = short["score"] == 0.0 and short["claims"] == []
    checks.append(ok)
    print(f"{'PASS' if ok else 'FAIL'}  very short answer skips the LLM")

    print("ALL PASS" if all(checks) else "SOME FAILED", f"({sum(checks)}/{len(checks)})")
    return 0 if all(checks) else 1


if __name__ == "__main__":
    # Model replies can contain characters the Windows console encoding cannot print.
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if "--offline" in sys.argv:
        sys.exit(run_offline())
    pace_seconds = float(sys.argv[sys.argv.index("--pace") + 1]) if "--pace" in sys.argv else 0.0
    sys.exit(run_live(pace_seconds))
