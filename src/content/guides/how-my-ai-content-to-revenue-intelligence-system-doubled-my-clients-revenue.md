---
title: "How My AI Content-To-Revenue Intelligence System Doubled My Client's Revenue"
type: "guide"
topics: ["ai-content-systems", "content-strategy", "automation"]
date: 2026-09-19
description: "The process behind my AI content system: sales and marketing data shapes each blog, Claude writes it from evidence, checks gate publication, and the loop is built to feed verified results into the next decision."
image: "https://res.cloudinary.com/dimapmlre/image/upload/v1789788749/state-heroes/writings-v1-how-my-ai-content-to-revenue-intelligence-system-doubled-my-clients-revenue.jpg"
---

My AI Content-To-Revenue Intelligence System doubled the revenue of my client, Cobalt Intelligence. And the way the system works, it holds one discipline at every single step: sales and marketing data shapes what gets written, and nothing in the loop is allowed to claim more than it can prove.

## What is an AI Content-To-Revenue Intelligence System?

So, when I say AI Content-To-Revenue Intelligence System, I am using that name for the whole loop that my client's blog runs on. That means deciding what to write, making it, publishing it, and then measuring it. But I want to be more accurate here, because inside the system itself, the acronym CTRIS only names the deciding core. That deciding core is the part that reads the sales and marketing data and turns it into a locked list of topics for the week. Then a separate writing lab, where Claude does the drafting, makes each post from that list. And after that, a publishing lane puts the post live, and the loop sets fixed windows for measuring it.

> "The first division separates deciding what deserves to be written from making what was decided."

That sentence comes from the guide that documents the system, and the way I understand it is that the topic is already settled, together with its evidence, before any writing starts. The writing side receives the topic and its evidence, and then it does the work of making the post.

## Which sales and marketing data should shape what a blog covers?

This is the part where I want to slow down, because every source in the loop comes with a written limit. The limit says what that source can support, and it also says what that source cannot prove on its own. And the limit matters as much as the data itself, because without it, each dashboard starts to look like it is proving that its own channel is the one driving revenue.

| Source | What it tells the loop | What it cannot prove alone |
|---|---|---|
| Google Search Console | Which queries and pages earn impressions and clicks, and where they rank | Buyer intent, fit with the ideal customer, or revenue |
| Google Analytics (GA4) | Traffic to each landing page and its conversion events | That the page caused a sale |
| The CRM (Close), read in aggregate | Patterns across leads, deal stages, calls and customers | Anything about one customer, or cause and effect |
| Demo bookings with first-touch UTM tags | Where each lead first came from | That a blog caused the booking |
| The live blog inventory in Webflow | What is already published, so new topics do not duplicate it | What the product can do today |
| Answer-engine tests in OpenAI, Gemini and Perplexity | Whether AI tools cite the site when asked a scheduled set of test questions | A product claim or a sales outcome |
| Sales call transcripts | The words buyers use and the objections they raise | The meaning of a quote once it is copied out of the call |

On top of those sources, there are four rules that govern the inputs:

- **Stale data blocks a new queue.** Each source has a maximum age at the weekly lock. So if a critical source is missing or stale, the lock does not build a new queue. It keeps last week's verified queue instead.
- **First touch is kept.** The booking record keeps the source that first brought a lead in. There was an old internal tag that could overwrite that first source, so it was retired, and new internal links are not allowed to overwrite it either.
- **Buyer language comes from the call itself.** If a quote from a sales call is going to shape a post, the writer has to reopen the original transcript first. A quote that was pasted into a spreadsheet is never enough on its own, because once it is copied out of the call, the context that shows what the buyer meant is no longer with it.
- **Product claims pass a product check first.** Anything a post says the product does has to match a verified product fact sheet, and that includes the limitations that a buyer needs to hear, not only the capabilities.

## How does sales and marketing data shape each week's blog topics?

By design, in an ordinary week, each candidate topic receives a score that is built from six factors. I will list them starting with the one that carries the most weight, commercial evidence, and ending with the one that carries the least, strategic readiness:

1. commercial evidence;
2. buyer-decision relevance;
3. product and ideal-customer fit;
4. AI citation opportunity;
5. search opportunity;
6. strategic readiness.

Search opportunity sits near the bottom, and that placement matches the limit that we saw in the source table above. Search Console shows what people search for, but it cannot prove intent to buy. So even when many people are searching for a phrase, that alone does not tell us that the people searching are going to buy.

Then a week runs on one of two routes.

- **A feature week starts with me.** In a feature week, I approve one product feature for the week, and that week becomes a pillar post with supporting posts that link up to it. The evidence still matters here, because the evidence decides what those posts are allowed to claim and how they are built. But the evidence never cancels the week, because my mandate is the reason that week exists in the first place.
- **An ordinary week starts with the data.** In an ordinary week, each chosen topic is either data-qualified, which means its six scores are visible, or it is an experiment. And an experiment has to be open about what it is. It has to name the evidence that it is missing and state what it expects to measure.

Every topic on either route still has to clear the same gates. It has to pass product accuracy and fit with the ideal customer, it needs factual support and a working path to conversion, it cannot duplicate an existing post or compete with an existing post for the same search, and it cannot change a protected page. And when there is a gap in the week, unsupported filler is never used to close it.

The output of all of this is a readable Decision Brief. For each topic, the brief shows the role that the post plays, the buyer question that it answers, how it connects to the product, what its evidence is and where that evidence reaches its limit, its linking role in the cluster, and what the post is expected to change in the numbers. The brief is locked with a hash, which works like a fingerprint of the exact records behind it. So if one of the records behind the brief is wrong, the record itself gets corrected and the week re-enters its first stage. Editing the brief itself changes nothing, because the brief is only the readable view of those records.

There is also a wording rule that keeps a label from outrunning the data. When someone describes a post's origin as "revenue analytics," that post's own brief keeps those words. But the lab still classifies that origin as a commercial signal until the data can support cause and effect.

## How does AI write a blog from evidence without inventing claims?

The writing lab uses what it calls a Sayers-inspired method, and I want to be careful with how I say that. Dorothy L. Sayers never published a copywriting formula, so the lab borrows two of her ideas and says so openly. The first one is the order of learning that she describes in [The Lost Tools of Learning](https://gutenberg.ca/ebooks/sayers-lost/sayers-lost-00-h.html), where she lists the parts as "Grammar, Dialectic, and Rhetoric, in that order." The second one is her account of creative work as Idea, Energy and Power in *The Mind of the Maker*. For AI writing, what Grammar, Dialectic and Rhetoric give us is the working order: evidence comes first, then the argument, and only after that, the prose.

Each post moves through five stages, and a stage cannot begin until the previous one has recorded a pass:

1. **Intake** locks the topic's origin, the target reader, the evidence window, and a ban on any production write, so nothing in the writing lab can publish the post.
2. **Grammar** builds an evidence pack that keeps observations, inferences and unknowns apart, and it removes every claim that does not have support.
3. **Dialectic** maps the argument. It writes down the reader's real question, a thesis, the strongest objection together with an honest answer, and the claims that the post will deliberately not make.
4. **Idea** locks one governing idea and a test that every section has to pass.
5. **Draft** writes the post and runs one full quality pass.

If you are only going to copy one stage from this, copy Dialectic's list of claims the post will not make. The reason is that the first hard gate in the Draft stage is a fabricated or unsupported fact, and Dialectic is where that boundary gets written down, before a single paragraph even exists.

Then the quality pass in the Draft stage checks:

- each source and where it came from;
- product claims against the verified product facts, including limitations the post must state;
- fit with the ideal customer and with search intent;
- every citation, with a live check that the linked page loads and supports the claim;
- style, parsing, FAQ markup, internal links and the call to action;
- one rating from a buyer persona.

A failing draft gets at most three controlled revisions. If a hard gate still fails after the third one, the post is blocked and it is reported to me. A post that passes is locked by a SHA-256 hash of its exact bytes, so any later change, even a small one, sends it back to the Draft stage.

So who does what here? Claude does the reading and the writing. The guide that documents the system says the model "reads evidence, separates observation from inference, builds the argument, locks the governing idea, drafts, and audits." Claude Code supplies the tools. The scripts perform the operations and enforce the gates, for example validating the records and computing the hashes.

## What checks run before and after an AI-written blog goes live?

For net-new blogs, I authorized publication without a human approval step, but I want to be clear about what that authority actually covers. It only covers posts that pass every Draft-stage gate. It also depends on a separate publishing lane that re-checks the technical facts by script before anything goes live.

The publishing lane does not form a second editorial opinion. It confirms only what a script can confirm:

- the post's bytes still match the hash the Draft stage recorded;
- the audit and the handoff agree with each other;
- every required Webflow field and asset is present;
- the FAQ markup parses;
- no source behind the post has passed its validity date.

After that, it runs a dry run, publishes through the Webflow API, and then checks the live page for an HTTP 200 response, the expected title or H1, the hero image and the FAQ. Afterward, an automated workflow is set to reconcile Webflow with the tracking sheet.

The derivatives only start after the live post is verified, and by derivatives I mean a LinkedIn carousel with its description, and YouTube Shorts scripts. And if one of those derivatives fails, the blog stays live, because the blog was already verified on its own.

## How is each published blog meant to feed the next topic decision?

The loop sets four fixed measurement windows for every published post:

| Window | What the loop is set to check |
|---|---|
| 7 days | Indexing, URL health and technical availability |
| 30 days | Impressions, clicks, click-through rate, engagement and AI citations |
| 60 days | Search direction and conversion events |
| 90 days | Attributed leads, bookings, opportunities and customers |

There are two recording rules that protect those numbers. The first one is that missing attribution is written as Unknown, never as zero, because a zero would say that the post was measured and earned nothing, and that is a different thing from not knowing yet. The second one is that opportunity value counts as pipeline evidence, not as collected revenue.

The operating rule that closes the loop is very short: "Feed verified results into the next lock." The way I read that rule is that what a post earns at its later windows is meant to become evidence for a later week's decision.

There is also a second feedback rule, and this one protects what already works. When a page is connected to a booked demo or to a deal that moved forward, it becomes protected. Automation is not allowed to change its content, title, headings, metadata or URL. New posts can still link to it and send it readers, but any change to the page itself needs my explicit approval.

## Why does my content-to-revenue system never credit revenue to a single blog post?

The short answer is that it cannot prove that, and the whole design depends on nothing claiming more than it can prove.

The loop can show that a buyer first arrived through a post and later booked a call. But it labels that link as a correlation, not as proof of cause. The writing lab's own readiness check also recorded that blog-level analysis was not yet mature enough to prove that a particular blog caused revenue, so that label is going to stay until the data can prove cause.

So the doubling is a business-level result. I credit it to the system as a whole, and I never credit it to any single post.

## How can you build a content-to-revenue loop for your own blog?

These steps adapt the system to a smaller setup, and I want you to treat them as a method to test, not as a promise of my client's result. Before you start, you need three inputs: search data, analytics that record conversion events, and a CRM or booking record that keeps each lead's first source.

1. **List your sources and write each one's limit.** For every data source that you use, write one line on what it can show, and then one line on what it cannot prove alone. You can begin with Search Console and your CRM. Caution: if you skip that second line, whichever source reports the biggest numbers will end up choosing your topics for you.
2. **Protect first touch before you add links.** Record where each lead first came from, and confirm that no internal link or tag can overwrite it. Caution: a later tag can overwrite the first source, and that is the reason the old internal tag in my client's system was retired.
3. **Separate deciding from making.** Choose your topics in one place, from evidence, and then write them in another place. Give the writer a brief that says why the topic exists and what the post is allowed to claim.
4. **Weight commercial evidence above search volume.** You can use your own factors, but rank the signals that come from sales conversations above search demand. Caution: a young blog will not have much commercial evidence yet, so label those topics as experiments and name what each one is testing.
5. **Write the boundary before the prose.** For each post, list the claims that it will not make before you start drafting. If there is a claim that you cannot source, delete it.
6. **Gate the draft before anything publishes.** Let a script probe every link live and lock the approved text, so that any later edit shows. Then check each product claim against a written fact sheet as its own review step. Caution: only let automation publish what passed every gate, and send everything else to a person.
7. **Measure at fixed windows and keep Unknown honest.** Choose your windows and record missing attribution as Unknown. Then feed only verified results into the next round of topic choice.
8. **Protect the pages that bring in sales conversations.** Once a page is tied to a booked call or a customer, stop automation from editing it, and link your new posts to it instead.

The test for whether you are ready to build the full loop is one you can run today: open your CRM and check whether your recent leads show the page or campaign that first brought them in. If that field is empty, spend your first weeks on steps 1 and 2, and run every topic as a labeled experiment until your data can see where a sales conversation began.
