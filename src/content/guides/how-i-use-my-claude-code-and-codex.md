---
title: "How I Use My Claude Code and Codex"
type: "guide"
topics: ["ai-content-systems", "automation"]
date: 2026-09-15
description: "The roles behind how I run Claude Code and Codex end to end: what I decide, what the coordinator and its subagents do, and where the proof and the final judgment come from."
image: "https://res.cloudinary.com/dimapmlre/image/upload/v1789786421/state-heroes/writings-v1-how-i-use-my-claude-code-and-codex.jpg"
---

So, before Claude Code or Codex touches any file in my work, I have already made five decisions. I have decided what the work is for, what it must contain, what it may not touch, who may release it and what will count as finished, and then at the very end, one decision comes back to me, which is whether the result is actually good enough. Everything that the two tools do happens in between those two points.

That split is how I work with both tools from start to finish, and the making of this article is a real run where you can see the roles doing their part.

Now, when people hear words like coordinator agent and agentic loop, it is fair to assume that these words belong to engineering teams who are building large systems. But most of the better terms in the table below actually match the language of the [Claude Certified Architect](https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification) exam, and I hold that certification. The exam guide describes its ideal candidate as "a solution architect who designs and implements production applications with Claude." And I use those same roles for my own work.

## What are the roles when I work with Claude Code and Codex?

| Part | Better term | What it does in my work |
|---|---|---|
| You | Human solution architect | Me. I set the purpose, specifications, limits, authority and acceptance for each job. |
| Codex or Claude working alone | Agent using tools | Reads files, runs commands and makes edits, checking each result before the next step. |
| Codex or Claude delegating work | Coordinator agent | The same tool when a job is split. It hands parts out and combines what comes back. |
| Delegated agents | Subagents | Helpers that each work on one part in a separate context and return a result, not their whole trail. |
| What the coordinator does | Orchestrates the multi-agent workflow | Decides which subagents run and what each is told, then checks and merges their returns. |
| Repeated tool-use cycle | Agentic loop | Gather context, take action, verify the result, and go round again. |
| Your review or escalation point | Human-in-the-loop workflow | The places where work stops for me: a new request, a real blocker and the final approval. |
| Context, stages, and recorded state | ICM structure | Numbered stage folders, a context file for each stage, and output folders that show what has already run. |
| Proof that requirements were met | Evaluation and verification | Check scripts, evidence in each reply, an independent review and my approval of the exact draft. |

If you look at the first column, Claude and Codex appear in the same rows, because in my work, either tool can take either agent role. So the role follows what the tool is doing at that moment.

## How does work move between the roles?

```text
Me, the human solution architect
        |
        | purpose, specifications, limits, authority, acceptance
        v
Coordinator agent
        |
        | decomposition, delegation, tool use, synthesis
        v
Subagents and tools
        |
        | outputs, failures, verifier results, evidence
        v
Coordinator evaluation and my human judgment
```

The way to read this diagram is by looking at the labels on the arrows. The first two arrows carry decisions. I tell the coordinator what the job is for and where its edges are, and then the coordinator breaks the job into pieces, hands those pieces out, calls the tools and puts the answer together.

But the third arrow carries something different, because what comes back is proof, and by proof I mean the files that were produced, the errors that were hit, what the check scripts said and the evidence behind each claim. The coordinator judges that proof first, before it reaches me, and then my judgment comes last.

There are two things in my setup that keep both tools under the same rules, whichever agent role they are in. The first one is one rulebook. [OpenAI's documentation](https://learn.chatgpt.com/docs/agent-configuration/agents-md) says "Codex reads AGENTS.md files before doing any work." Claude Code reads `CLAUDE.md` instead, so, as [Anthropic's memory docs](https://code.claude.com/docs/en/memory) suggest, my `CLAUDE.md` begins with a single line, `@AGENTS.md`, and that one line pulls in the same file. That means both tools start from the same root rules.

The second one is matching hooks. In my setup, a hook is a small script that the tool runs automatically at a set moment, and both of my tools run matching hooks at the same seven moments: when a session starts, when I send a prompt, before and after each tool call, before a long conversation is compacted, when a reply ends and when the session closes.

## What does the human solution architect hand over before work starts?

The top arrow in the diagram carries five things, and most of them already have a home in my rules, so they do not need to be restated in every conversation.

- **Purpose and specifications.** The request itself is where I say what the work is and who it is for. But for a larger job, my rules ask for more than the request. They require a brief that names the output, the command that verifies it, the files it may change, the exact condition for stopping and what should make the agent pause and ask.
- **Limits.** Write boundaries say which folders an agent may change and which ones it must leave alone. And source rules say what counts as evidence, so every fact has to trace back to something that the agent actually opened or ran.
- **Authority.** This one is a single line in my root rules, and it sets the terms for release: "Publishing access is not publishing authority." What I mean is that an agent that can log in to a publishing tool has access, but access alone does not give it my permission to publish.
- **Acceptance.** My rules allow the agent to say saved, fixed, verified, published or done only after it has observed the matching proof, such as the file, the command result, the readback of a spreadsheet, the live page or the visible screen, so the word done has to come with something that I can check.

## When is Claude Code or Codex an agent using tools, and when is it a coordinator?

When a job does not need to be split, the tool is simply an agent using tools. Anthropic's page on [how Claude Code works](https://code.claude.com/docs/en/how-claude-code-works) describes the cycle like this: "When you give Claude a task, it works through three phases: gather context, take action, and verify results." And it cycles through those phases as often as the task needs. The same page adds a line that matters for the human role, which is "You're part of this loop too." I can interrupt at any point and steer it in a different direction.

That repeated cycle is what the table calls the agentic loop, and the risk with a loop is that it can run away. This is why, in my setup, a hook watches from outside the model. After five repeated search calls of the same kind within 120 seconds, it warns the agent that it may be looping without progress, and it tells the agent to stop and diagnose before trying again. It fired several times during the research for this article.

The tool becomes a coordinator when it delegates. Anthropic's engineering team calls this pattern [orchestrator-workers](https://www.anthropic.com/engineering/building-effective-agents), where "a central LLM dynamically breaks down tasks, delegates them to worker LLMs, and synthesizes their results." In Claude Code, the workers are called [subagents](https://code.claude.com/docs/en/sub-agents). "Each subagent runs in its own context window with a custom system prompt, specific tool access, and independent permissions," and what it returns is a summary instead of everything it read. [Codex delegates too](https://learn.chatgpt.com/docs/agent-configuration/subagents). It "can run subagent workflows by spawning specialized agents in parallel and then collecting their results in one response," and my Codex sessions do that as well. The exam guide calls this shape hub-and-spoke, where "a coordinator agent manages all inter-subagent communication, error handling, and information routing."

And this is where one rule in my writing lab decides what a subagent's return is allowed to become:

> "Claude subagents are optional helpers inside a stage. They return findings to the main Claude or Codex operator, which validates and writes the physical stage output."

The same rule says a subagent may not write a stage file, move the work to the next stage, approve a draft or publish. So a finding stays a claim until the coordinator has checked it and written it down, and even after that, publishing the final file is still my decision.

## Where do context, stages and recorded state live?

They live in folders. The method is called ICM, the Interpretable Context Methodology, and [its paper](https://arxiv.org/abs/2603.16021) puts the idea briefly: "Numbered folders represent stages. Plain markdown files carry the prompts and context that tell a single AI agent what role to play at each step."

My writing lab has five numbered stages. Each stage has a context file that says what to load, what to skip, what to write and what must be true before the next stage opens, and each stage writes only to its own output folder. The lab does not keep a separate status tracker, because the status is simply what exists. If an output folder is empty, that stage has not run.

This is why a role can change hands. The state of the work sits on disk instead of in one conversation's memory, so a new session can read it, and so can the other tool.

## What does one real run look like from request to approval?

This article is the run.

1. **Architect.** I typed one request with the title, where the post goes in the Work contents and what it should explain, and I attached two screenshots, which were the first two columns of the table and the diagram above.
2. **Architect's limits.** Alongside my message, a prompt hook recognized that this was a request for my writing lab and named the lab's entry file. Its last sentence was "This reminder grants no approval."
3. **Coordinator.** Claude Code, which coordinated the whole run, read the lab's rules, copied a fresh record from the lab's template and wrote the intake brief. The brief covered who the piece is for, what kind of piece it is, which sources it may use, what it must leave out and where it goes on the site.
4. **Verification.** A small script checked that the brief recorded a pass before it would open the next stage. It printed `PASS: 02_grammar may read its required upstream artifacts`, where `02_grammar` is the folder of the evidence stage, and then the work moved on without asking me.
5. **Agentic loop.** For the research, the coordinator worked as an agent using tools. It read my rule files and hook settings, opened each official page that I quote here, and noted when it read each one along with a fingerprint of what it saw.
6. **ICM structure.** Two more stages decided what belongs in public and locked one idea for the piece and one brief for its image. Each of those stages opened only after the previous check passed.
7. **Subagent.** The fifth stage writes the draft and hands it to a reviewer subagent in a fresh context. That reviewer is allowed to read, search and list files, and nothing else, so it may not edit, run commands or browse. It returns its findings in one structured result, and the coordinator resolves or records each one.
8. **Human judgment.** Then the run stops and waits for me. I approve the exact draft by its SHA-256 fingerprint, and if a single byte changes afterward, the approval no longer counts. Only after that does a separate production step put the post on this site.

## Where does the work stop and wait for me?

Anthropic's guidance on agents says they "can then pause for human feedback at checkpoints or when encountering blockers." My setup names those checkpoints, so I know in advance where the stops are going to be.

- **A new request.** Claude proposes the skills that it plans to use and waits for my yes. When I say "just answer," it skips that step.
- **A real blocker.** Before the final stage, my writing lab stops for me only when it hits a privacy question, a login problem, a missing source or a question of authority. If it is a formatting or evidence problem that can be fixed, that problem stays inside the stage.
- **The final approval.** No new piece goes public on this site until I have approved its exact bytes.

And there are two rules that keep those stops from blurring. The first is that every reply ends with a line that starts "What I need from you:" and names the real request, or says "Nothing right now," so a question that I need to answer cannot hide in the middle of a status update. The second is that my yes applies to the proposal right before it and stays inside that proposal's scope.

## Do you need a coordinator and subagents to work this way?

Not to begin with. Anthropic describes agents as "typically just LLMs using tools based on environmental feedback in a loop," and every job in my setup starts as that single loop, with me able to steer it. Delegation has a price, though. OpenAI's Codex documentation says subagent workflows "consume more tokens than comparable single-agent runs," because each subagent does its own model and tool work. In my writing lab, delegation happens in only two places, which are an optional helper for research and a reviewer that has not seen the conversation behind the draft.

So if you are setting this up for yourself, the two things worth building first sit at the two ends of the diagram, which are the handover at the top and the proof at the bottom.

A test that you can use for your own setup is whether, at any moment, you can say which role you are playing and where the proof of "done" will come from. If you cannot say that, then the agent is probably filling the architect's role by default.
