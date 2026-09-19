---
title: "What Is the Folder System That Makes My AI Engineering Better Than an Agentic Setup?"
type: "guide"
topics: ["ai-content-systems", "data-architecture"]
date: 2026-09-19
description: "What ICM is and how it differs from an agentic setup, with a tour of the folder workspace I build my AI engineering in."
image: "https://res.cloudinary.com/dimapmlre/image/upload/v1789756372/state-heroes/writings-v1-what-is-the-folder-system-that-makes-my-ai-engineering.jpg"
---

Every new operational workflow in my AI engineering starts as a folder tree, not a framework, and my own rules make that the default. So each workflow gets numbered folders for its steps, and inside each folder there is a plain text file that tells one AI agent what that step requires, which means the agent reads its way through the work one folder at a time.

The job those folders take over has a name, and the name is orchestration. When I say orchestration, I mean deciding what happens next, what each step gets to see and where each result goes. In the ICM paper's terms, an agentic setup does its orchestration in code, and ICM, the method behind my folders, does its orchestration in files that you can open and read yourself.

If `CLAUDE.md` files and AI agents are still new to you, my [AI Systems Blueprint for Beginners](/ai-systems-blueprint/) is the better place to begin. This piece assumes you have already seen an agentic setup, and what you want now is to see what the alternative looks like from the inside.

## What is ICM, the folder system behind my AI engineering?

ICM stands for Interpretable Context Methodology. It comes from Jake Van Clief and David McDermott, who describe it in a [paper posted to arXiv in March 2026](https://arxiv.org/html/2603.16021), and the protocol is open source under the MIT license, so its files are available in the [ICM repository on GitHub](https://github.com/RinDig/Interpretable-Context-Methodology).

The way I understand the method is that it replaces framework code with folder structure. The stages of a workflow become numbered folders. Each stage folder holds a `CONTEXT.md` file, and that file works like a stage contract, because it says which files to read, what to do with them and what to write. Then the mechanical work that does not need AI at all is handled by local scripts. The paper puts the whole trade into four short sentences:

> "Stage sequencing is the folder numbering. Context scoping is the folder hierarchy. State management is the files on disk. Coordination between stages is one folder's output being another folder's input."

In a framework, each of those four jobs is done in code. In ICM, you can see all four of them in a file browser. The order of the work is the order of the folder names. What the agent reads at a step is whatever that step's `CONTEXT.md` points to. What has happened so far is whatever files exist. And the hand-off between stages is simply that one stage's output folder becomes the next stage's input.

## How is an ICM workspace different from an agentic setup with multiple AI agents?

In the paper's terms, an agentic setup is a multi-agent framework that manages "context passing, memory, error handling, and step coordination through code." The authors name CrewAI, LangChain and AutoGen, and they say plainly that these frameworks work. So their argument is actually narrower than it first sounds, because it only covers one kind of work: when a workflow runs in order and a person reviews each step, the framework is solving a coordination problem that folders can solve instead.

The paper has a comparison table that shows the trade, and I kept all ten rows here, including the four where a framework comes out ahead, because you should see both sides before you decide anything:

| Dimension | Framework approach | ICM approach |
|---|---|---|
| Change stage order | Edit orchestration code, redeploy | Rename or reorder folders |
| Modify a prompt | Edit agent configuration in code | Edit a markdown file |
| Add or remove a stage | Write new agent class, update orchestrator | Add or delete a folder |
| Inspect intermediate state | Add logging, build dashboard | Open the folder, read the files |
| Hand off to another person | Document environment, dependencies, setup | Copy the folder |
| Who can make changes | Developer | Anyone with a text editor |
| Error recovery mid-pipeline | Built-in retry, fallback, exception handling | Manual re-run of failed stage |
| Conditional branching | Programmatic routing based on agent output | Human decides between stages |
| Concurrent execution | Native parallel agent coordination | Sequential by design |
| External service integration | Programmatic API calls, auth management | Local scripts or MCP connections |

*From Table 1 of the ICM paper.*

The way the paper describes it, the top six rows are common operations that ICM simplifies, and the bottom four are capabilities that ICM "lacks or handles less well."

"One agent" is easy to misread as "no helpers," so I want to be careful here. In the paper's own workspaces, the main agent, Claude Opus 4.6, hands sub-tasks to Claude Sonnet 4.6, and it uses the same folders to decide what each helper gets to see. My writing lab works the same way. It has two optional helper agents that can research or review, but they only return findings, and it is the main session that writes every stage file. So the orchestration still lives in the folders, even when helpers are involved.

## Is an ICM folder system actually better than an agentic setup?

I do think it is better, but I have to be careful about how I say that, because "better" needs a measure, and I should name mine before I claim anything. What I mean by better is easier to change and to inspect, for work that runs in order and gets a person's check at each step. Output quality is a separate question, and I have no measurement of it to show you. The paper that defines ICM reports none either:

> "No controlled comparison has been conducted between ICM's staged context loading and a monolithic prompting approach on the same tasks..."

The closest the paper comes to a comparative number is about context size, and even that is an illustration from one of the authors' own workspaces. When everything was loaded into one prompt, meaning every stage's instructions, reference files and earlier outputs, it came to about 42,000 tokens. When each ICM stage loaded only its own material, it came to between roughly 4,900 and 5,600, which is under a seventh of the single prompt. But I have to be honest about what that number is comparing. It compares ICM with one large prompt rather than with a framework, and it measures how much the model reads, which is a different thing from how good the output is.

So here is the claim in its weakest form, because that is the form I can actually defend. For work of that shape, two of the table's six rows hold in my writing lab as written, and the way I keep rules adds a third point:

- **Changing a stage's instructions means editing a markdown file.** Each stage takes its instructions from its own `CONTEXT.md`, and new articles copy those files from the lab's template, so changing how a stage behaves for new articles is an edit to the template's copy of that file.
- **Checking progress means opening a folder.** Each stage writes to its own `output/` folder, and an empty one means the stage has not run, so I can see where a piece stands just by looking.
- **Changing a rule starts in one file.** Each rule has one home in the lab's shared folder. Then a checker, `_shared/check-rules.py`, lists every file that restates that rule, and each of those files is either updated or marked as checked before the change counts as done.

The other rows come with a cost in my setup, and I would rather you know that now. The script that guards each stage, `scripts/verify-stage.py`, keeps its own list of the five stages and of the files each of the first four must write. So reordering or adding a stage, or changing what an early stage writes, means editing that script as well as the folders. A rule change also only counts as done after two check scripts pass, so changing the lab takes a terminal as well as a text editor. And handing the lab to someone else would take more than copying a folder, because publishing runs through a separate production lane and through the site itself.

Each of those limits, like each claim, is a property of files, so you can check every one of them. The claim only holds while the work keeps that shape.

## What are the five layers of an ICM workspace, and where do they sit in my files?

The paper organizes a workspace's context into five layers. Each layer answers one question for the agent, and the agent only reads down as far as the current step needs. The right-hand column is my own reading of where each layer sits in my files, and I want to be clear that it is my reading, because the paper does not describe my workspace.

| Layer | The agent's question | Where it sits in my workspace |
|---|---|---|
| 0. `CLAUDE.md` | "Where am I?" | The root `CLAUDE.md`, whose first line imports `AGENTS.md`: the shared rules plus a routing table that pairs each kind of request with the file to open first |
| 1. `CONTEXT.md` | "Where do I go?" | Each workspace's entry file and `CONTEXT.md`, such as the writing lab's one-screen map of its five stages |
| 2. Stage `CONTEXT.md` | "What do I do?" | One `CONTEXT.md` per stage: its one job, what to load, what to skip, what to write and the exit gate that must pass before moving on |
| 3. Reference material | "What rules apply?" | The `_shared/` folder in the writing lab and in the VA Resume Converter, with one home file per rule, stable across every run |
| 4. Working artifacts | "What am I working with?" | The `output/` folder of each stage inside one article or one applicant's record |

Because one root folder holds many workspaces, the first two layers actually repeat. The root file routes a request to a workspace, and then that workspace's own entry file routes it again, this time to a stage.

The paper gives the line between Layers 3 and 4 its own table, and it uses an analogy for it: reference material is "The recipe" and working artifacts are "The ingredients." In my writing lab, the voice profile and the source rules are the recipe, and one article's research notes are the ingredients. Because they sit in separate folders, each stage's contract loads the rules from `_shared/` and loads one article's notes from that article's stage outputs, so the notes come in as input and not as rules.

## What does my whole AI workspace look like from the top folder down?

Everything in this tour sits under one folder, and that folder's parent is read-only, so a new project has to go inside it. What you see below is the top of the tree, trimmed down to the parts this piece is about, and I left out one folder of client work and a few private folders.

```text
workspace/                     read-only, holds one folder
  life-dashboard/
    AGENTS.md                  shared rules and the routing table
    CLAUDE.md                  imports AGENTS.md, plus Claude-only notes
    system/
      registries/              indexes: skills, project names, recurring work
      skills/                  eight reusable skills, one copy each
      map/                     routing for requests with no known owner
      tools/                   small scripts and verifiers
    personal/
      writings/                this blog: editorial lab, production, site
    career/
      va-resume/               the VA Resume Converter
    learning/                  study workspaces, such as screenshot OCR
    video/                     skills for video work
```

Two parts of that tree do the routing. For known requests, it is the table in `AGENTS.md`. And when a route is unknown or conflicting, the agent opens `system/map/`, whose entry file begins: "This workspace is an observed-reality routing map. It does not own publication, credentials, workflow state, or production authority." So the map names an owner, and it does none of the owner's work.

Below the top level, there are 14 folders outside my client work that carry their own entry file and their own `CONTEXT.md`. Each one has its own map, so an agent that reaches it can find its way from there. And my rules say that when an ICM workspace owns a workflow, it "remains the sole operational home," so no copied folder, wrapper prompt or outside script may run that workflow somewhere else or override its stages without my explicit approval.

## What does one ICM workspace look like inside, using the folder that produced this article?

My blog's writing lab is an ICM workspace, and this article actually has a folder in it. Here is the lab with this article's record open. I trimmed the tree so it only shows the main parts and the main output file of each stage:

```text
personal/writings/editorial/
  CLAUDE.md                the map: if this happened, read that next
  CONTEXT.md               the five stages on one screen
  _shared/                 the rules, one home file each
  _templates/piece/        the copy every new article starts from
  scripts/                 creates records and checks stage gates
  _index/log.md            where each record lives, never its status
  pieces/
    what-is-the-folder-system-that-makes-my-ai-engineering/
      REQUEST.md
      01_intake/     CONTEXT.md   output/piece-brief.md
      02_grammar/    CONTEXT.md   output/evidence-pack.md
      03_dialectic/  CONTEXT.md   output/reader-map.md
      04_idea/       CONTEXT.md   output/idea-brief.md
      05_draft/      CONTEXT.md   output/candidate-blog.md
```

- **The map comes first.** At the center of `CLAUDE.md` there is a route table with three columns: what just happened, what to read next and when to advance. It routes to the procedure rather than carrying the procedure itself.
- **Each stage has one job.** Intake locks what the piece is for. Grammar establishes what is true. Dialectic decides what belongs in public. Idea locks the governing idea and the form. Draft writes and audits the article. The lab names Idea as the stage that carries the most weight, because a wrong format decision there can turn a directory into a memoir, and that kind of decision is cheapest to fix before any prose exists.
- **Every article starts as a copy.** The script `scripts/new-piece.py` copies `_templates/piece/` into a new folder, so every record begins with the same five stage contracts.
- **Files are the status.** No tracker says where a piece stands, because its stage folders already say it, and the log only records where each piece lives.
- **A script guards each doorway.** Before a stage can start, `scripts/verify-stage.py` confirms that every earlier stage wrote its output and recorded a pass. Its own description reads: "Fail closed when a WBL piece tries to enter a stage without passing inputs." WBL here is this blog, Writings by Lala.
- **A person has the last word.** The first four stages continue on their own when their checks pass. The fifth one sends the draft to a fresh-context AI reviewer, and then it stops and waits for my approval of the exact draft before anything is published.

## What rules did I add to ICM so each workspace stays trustworthy over time?

The paper describes the pattern, and my `icm-workspace` skill is where my own rules for building a workspace live. Its core reads:

> "Folders carry sequencing, hierarchy carries context, files carry state. Nothing is remembered; everything is somewhere."

The way I read "Nothing is remembered" is as a rule about AI agents. A chat session ends or gets summarized, while a folder stays, so anything the next session needs has to be written somewhere it will be found. The same skill lists five invariants and then adds, "All five, or it is just folders." The rules below are the ones I build by. Two of them come straight from those invariants, two go past the paper, and two build on the paper's own ideas, so I marked which is which:

- **State lives only in files.** This one is an invariant in my skill. The paper keeps state in files too, but my skill goes further and allows no status field, so in my writing lab a log may say where a record is, not how far along it is.
- **Entry files route and never teach.** This is also an invariant. A `CLAUDE.md` may point to the `CONTEXT.md` to read next and the human check to stop at, but the procedure itself lives in the folder where the work happens.
- **A rule may be copied if the copy is tracked.** This one goes past the paper and its repository. The ICM repository's conventions give every piece of information one home and warn that copies drift. My skill keeps the one home, but it allows a copy at the stage where the rule bites, and it requires every workspace to ship a checker that flags a copy as STALE when its source rule has changed, flags a file as UNREGISTERED when the rule map does not track it, and flags an entry as MISSING when its file is gone. Marking a stale copy as fine requires a written reason.
- **One workspace owns each workflow.** This one goes past the paper too. Before any workflow changes, the agent checks whether an ICM workspace already owns it, and if one does, the change goes into that workspace.
- **A stage cannot start until the one before it passes.** This one builds on the paper. The paper lists a Verify step between stages as future work, and my writing lab runs a version of it today: the doorway script above, plus a final review that reads the draft against the earlier stage files.
- **Fixes go to the source.** This one follows the paper's own argument, which is to fix a stage's instructions or reference files so the improvement reaches every later run, instead of patching one output. In my writing lab, a rule change goes to its one shared file, and then the checker lists every file that depends on it.

One decision comes before all of these, because it is hard to reverse, and that decision is the layout. The paper's example keeps one set of stage folders in a single `stages/` folder. My skill offers two layouts. In a per-lane layout, stages sit at the root as lanes that a unit can enter. In a per-record layout, every unit of work gets its own copy of the stages. Both of my examples are per-record, so every article in the writing lab has its own five stages, and the [VA Resume Converter](/bonafide-filipino-freelancers/va-resume-converter/) gives each applicant a folder copied from a six-stage template, from intake to the finished package, with a manual run stopping at the draft for my review.

## When is an agentic framework a better choice than an ICM folder system?

The paper answers this one directly: "ICM is not a replacement for multi-agent frameworks in every context." And it names three cases where that is true.

- **Agents that must respond to each other in real time.** File hand-offs between stages are too slow for tight loops, so a folder pipeline cannot keep up there.
- **Many users on the same pipeline at once.** ICM is local-first by design, so serving concurrent users means building the queueing and state isolation that ICM was designed to avoid.
- **Automated branching mid-pipeline.** A person can choose which stage runs next, but letting the agent make that choice takes scripting that moves ICM toward being a framework itself.

The bottom four rows of the comparison table point the same way. Retries, programmatic branching, parallel agents and programmatic service connections come built into a framework, and the paper says ICM lacks them or handles them less well.

So the condition I would use is the one the paper sets. If your AI work runs in a fixed order, a person should check each step, and the same pipeline runs again with new input, then I would put the orchestration in folders first. And I would move it into code when the work stops fitting that description.
