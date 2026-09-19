---
title: "What AI Systems Do I Use for Work?"
type: "guide"
topics: ["ai-content-systems", "automation", "prompt-engineering"]
date: 2026-09-18
description: "The files, settings, hooks and checks behind how I run Claude Code and Codex, with step-by-step fixes for lost instructions, permission prompts, token burn and stray edits."
image: "https://res.cloudinary.com/dimapmlre/image/upload/v1789785886/state-heroes/writings-v1-what-ai-systems-do-i-use-for-work.jpg"
---

So, the way I understand it, most of the problems people blame on Claude Code and Codex come down to one question, and that question is where a rule lives. A rule that lives only in the chat gets summarized away as the conversation grows, while a rule that lives in a file comes back every session, and a rule that lives in a setting or a script holds even when the model drifts.

Anthropic's documentation for Claude Code draws the same line:

> "Permission rules are enforced by Claude Code, not by the model. Instructions in your prompt or `CLAUDE.md` shape what Claude tries to do, but they don't change what Claude Code allows."

That second sentence is really the method I work by. An instruction is a request that the model will try to honor, and a setting is a fact about what the tool permits. Much of my setup grew from corrections, and in my setup a correction only counts as kept after it is written into the file that owns the rule and read back.

I use this setup for my work and for my personal projects, including the writing lab that produced this article. When I say setup, what I mean is plain text files, settings files, a set of hooks and a few check scripts. I have not measured token or time savings, so there are no savings figures here. For each problem, you get what the tool's makers document where they cover it, then how my setup handles it, and then numbered steps you can follow.

If you have never opened a terminal, I would start with my [AI Systems Blueprint for Beginners](/ai-systems-blueprint/) instead, because this guide assumes you already use Claude Code or Codex on real work and you keep hitting the same walls.

## What does my AI system for work actually consist of?

When I list it out, it comes to thirteen principles, and each one is stored in a specific place:

| Principle | Where it lives in my setup | The failure it prevents |
|---|---|---|
| The root instruction file routes and does not teach | `AGENTS.md`, imported by `CLAUDE.md` | Instructions lost in long sessions |
| Permissions are settings, not requests | Allow rules in settings, plus hooks | Constant prompts |
| Research happens outside the main conversation | Subagents that return a summary | Token burn |
| Edits stay inside their scope | Written write boundaries, one project folder, worktrees | Broken unrelated files |
| "Done" needs evidence | A done checklist and a stop hook | False completion |
| Corrections are written down with a reason | Memory files with Why and How to apply | The same mistake next week |
| Facts, links and flags are checked before use | Source rules, live link checks, `--help` | Invented details |
| Workflows are folders | Numbered stage folders, one `CONTEXT.md` each | Runs that differ every time |
| Two tools share one rulebook | One `AGENTS.md`, one copy of each skill | Claude and Codex drifting apart |
| Routing is a table | A skill index plus a prompt hook | The wrong workflow for the request |
| Banned words live in one file | A list every writing-lab draft is scanned against | Writing that reads as AI |
| Access is separate from authority | A written access-versus-authority rule, and exact-draft approval in my writing lab | Publishing nobody approved |
| Look before asking | A written rule and a one-line handoff | Questions the agent could answer itself |

A skill, in Claude Code's own terms, is a way to extend what Claude can do: you write a `SKILL.md` file with instructions, and Claude adds it to its toolkit and uses it when it is relevant. A symlink, which is short for symbolic link, is a pointer, so the real folder lives in one place and the link only points to it, and every tool that opens the link is actually reading that one original. Eight reusable skills sit in one folder on my machine and are symlinked from there instead of copied, which is why I have one copy of each skill to keep updated. Each does one job:

- **Workspace builder.** Stamps out a new stage-folder workflow.
- **Existence gate.** Asks whether a new file, script or dependency needs to exist before anyone adds it.
- **Senior review.** Runs an evidence-first engineering review of code, a workflow or a readiness claim.
- **Speaking-voice rewrite.** Rewrites material the way I explain things out loud.
- **Headline review.** Critiques titles and opening hooks in the style of Alex Hormozi.
- **SDK router.** Routes projects built on the Claude or OpenAI SDKs.
- **Command coach.** Tightens a vague request into a clear command.
- **Instruction cleanup.** Cuts rule files down to routing plus checks.

## Why is Claude ignoring my instructions or hallucinating after 10 to 15 messages?

The number is yours, and I think it changes with how much each message carries, but the mechanism behind it is documented. Everything Claude is holding at once sits in what is called the context window. Your `CLAUDE.md`, your memory, your skill descriptions and the names of your connected tools are already in it before your first prompt, and every file Claude reads makes it bigger. As a session grows, so does its context, and when it gets close to the limit, Claude Code summarizes the conversation history to make space, which the docs call compaction.

Anthropic's memory docs say what gets lost in that summary: "If an instruction disappeared after compaction, it was given only in conversation," unless it sits in a file that has not reloaded yet. So the project-root `CLAUDE.md` is re-read from disk after compaction, but a rule you only typed into the chat does not come back. And this is where the hallucinating part of the question comes in, because if the rule that dropped was the one telling the model to check a source first, the next answer can come from the model's memory instead of the source.

The size of the rule file matters too. Anthropic's guidance for `CLAUDE.md` is to "target under 200 lines per CLAUDE.md file. Longer files consume more context and reduce adherence." So a long rule file costs you twice, because it takes room away from the work and the model also follows it less.

My root file carries only triggers, pointers and hard boundaries. The procedure for any task lives in the folder where that task happens, and the agent reads it when it gets there. Hooks help here too. A hook, as Anthropic describes it, is a user-defined shell command that Claude Code runs at specific points in its lifecycle, "which gives you deterministic control: certain actions always happen rather than relying on the LLM to choose to run them." Two hooks keep the important parts in view:

- **On every prompt**, a hook adds a short working rule, and when it recognizes a known workflow, it also names the file to open first. When I asked for this article, it recognized a request for my writing lab and pointed the session at the lab's entry file before any work began.
- **Before compaction**, another hook writes a checkpoint of the session to a file.

Progress lives in files as well, so a new session reads what already exists in the output folders instead of relying on what the last conversation remembered.

1. Run `/context` to see what is filling the window.
2. Count the lines in your `CLAUDE.md`. If it runs past 200, keep the triggers, pointers and hard boundaries, move each procedure into a file next to the work it governs, and leave a one-line pointer behind.
3. When you switch to unrelated work, run `/clear`, which starts a new conversation with empty context. When you continue the same work, run `/compact` with a focus, such as `/compact Keep the list of changed files and the failing tests`, so the summary focuses on what you care about.
4. Write progress to a file as you go, either a checklist or an output folder, so the next session reads state from disk.
5. In Codex, `/compact` summarizes the visible chat, and `/status` shows how much context remains.
6. Once the rest is in place, consider a `UserPromptSubmit` hook, which runs each time you send a message, and let it inject your single most important rule. It adds a few words to every message, so keep it short.

## How do I keep Claude Code from asking permission for every file read or git status?

The first thing I would check is whether it should be asking at all. According to [Anthropic's permissions page](https://code.claude.com/docs/en/permissions), file reads inside your working directory need no approval, and there is a built-in set of read-only commands, including `ls`, `cat`, `grep`, `find` and read-only forms of `git`, that runs "without a permission prompt in every mode."

So if `git status` still prompts in Manual mode, which is the mode that reviews every action, look at the whole command. Claude Code asks when it cannot fully parse a command, and it asks for `git` when there is an unquoted glob in it. A glob is a wildcard pattern like `*.ts` that stands for many file names at once, and Claude Code asks because the glob could expand into a flag, an option like `-delete`.

For everything else, what I would do is write rules instead of clicking Yes, and the quote at the top is the reason. A rule in settings is enforced, while a sentence in `CLAUDE.md` is only a request. This is Anthropic's own example:

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(git commit *)"
    ],
    "deny": [
      "Bash(git push *)"
    ]
  }
}
```

Deny rules are checked first, then ask rules, then allow rules, so the push stays blocked even when a broader allow rule also matches. A deny rule matches the command as Claude writes it, though, so a push written another way, such as `git -C . push`, slips past it, and for a boundary that does not depend on the command text, Anthropic points to sandboxing.

Hooks run alongside the rules. In my setup, one hook validates spreadsheet writes before they run, one warns when the agent loops on searches, one reminds it which workflow file to open first, and one checks the final reply for claims of completion. I want to be clear, though, that none of those four is a general guard against a destructive shell command, and for that you name the command in a deny rule. So start with rules.

1. Run `/permissions` to see every rule and the settings file it comes from.
2. When a prompt appears for a command you trust, choose "Yes, and don't ask again." Claude Code saves that rule to `.claude/settings.local.json` for the repository.
3. Put rules the whole team should share in `.claude/settings.json`.
4. Put the `*` after the subcommand. `Bash(git log *)` allows only `git log`, while `Bash(git *)` allows every git command, push included.
5. Add a deny rule for anything the agent should never run, such as `Bash(git push *)`, and an ask rule for commands you want to approve each time.
6. Press Shift+Tab to cycle modes. `acceptEdits` auto-approves reads, file edits and common filesystem commands. `plan` lets Claude read and explore without editing your source files. On Pro, Max and Team plans, auto mode is the built-in starting mode, and a classifier reviews actions in place of you. Leave `bypassPermissions` off your own machine, since Anthropic lists it for "Isolated containers and VMs only."

In Codex, the sandbox is what limits where Codex can write and whether it can reach the network when it runs commands for you, and the same controls come as flags and rules:

- **`codex --sandbox workspace-write --ask-for-approval on-request`** is the Auto preset. Codex reads files, makes edits and runs commands in the workspace, and asks before editing outside it or using the network.
- **`/permissions`** changes what Codex can do without asking, in the middle of a session.
- **A rules file** such as `~/.codex/rules/default.rules` uses `prefix_rule` to allow, prompt or forbid commands that run outside the sandbox. Test it with `codex execpolicy check --pretty --rules ~/.codex/rules/default.rules -- git status`. OpenAI marks rules as experimental.

## How do I stop burning through my entire token allowance in an afternoon?

[Anthropic's costs page](https://code.claude.com/docs/en/costs) puts it plainly: "Token costs scale with context size," and "Stale context wastes tokens on every subsequent message." Your usage is counted in tokens, so a long, wandering session keeps charging you for the wandering, on every new message after it.

One change in my setup moved research out of the main conversation. A subagent is a separate helper that runs in its own context window, with its own instructions and tools, and gives its results back, so web searches and wide file hunts go to a subagent and only a summary comes back into my conversation. The memory that holds this rule records my own words on it: research "should not pollute the main context." The subagent's own work still counts toward your usage, though, and the saving is that the main conversation does not carry all those raw results into every later message.

Two more habits keep the window small:

- **Load only what matches.** A routing table sends each request to one skill or workflow file, and each workflow folder's context file lists what to load and what to skip.
- **Stop loops early.** A hook warns the agent after 5 search calls in 120 seconds and tells it to stop and diagnose. It fired more than once during the research for this article, which is the kind of loop it is there to catch.

1. Run `/usage` at the start and end of a work block to see what a task costs. In Codex, `/status` shows token usage.
2. Use `/clear` between unrelated tasks. Run `/rename` first if you want to find the session again with `/resume`.
3. Send research and wide searches to a subagent. Give it the file paths, the question, what counts as a complete answer and a length cap for its reply.
4. Move instructions you rarely need out of `CLAUDE.md` and into a skill. A skill's full text loads only when it is used. Its description still loads, and every listed skill adds to context on each turn, so run `/skill-doctor` in recent versions to see what each one costs and turn off the ones you never use.
5. Prefer a command-line tool such as `gh` or `gcloud` over an MCP server that does the same job. An MCP server is a connector that gives Claude Code access to your tools, databases and APIs, and Anthropic's docs say CLI tools are more context-efficient because they add no per-tool listing.

## How can I stop Claude from breaking unrelated files during refactors?

I give the agent a smaller world. My rules say it plainly: preserve unrelated changes, patch shared files narrowly, never revert unrelated files, and never assume another terminal's changes are disposable. Dependency folders such as `node_modules` and `venv` are off limits, and so is `.git`.

Part of the boundary is physical, and that part holds without the model having to remember anything. The parent folder of my workspace is read-only and holds exactly one project folder, so an agent that tries to create a sibling copy fails at the filesystem. Throwaway experiments go in a temporary folder made with `mktemp -d`. Long-lived parallel work goes in Git worktrees inside the project. A worktree is a separate working copy of the same repository on its own branch, and Claude Code uses worktrees to keep parallel sessions apart so their changes don't collide. After any change to folders, the agent must run a path check script, and an unexpected folder counts as a failed task.

In Claude Code, `claude --worktree <name>`, or `-w`, creates an isolated worktree under `.claude/worktrees/<name>/` on a new branch, so the refactor happens away from your main checkout. `/rewind`, or pressing Esc twice on an empty prompt, rolls back Claude's edits, but there is a limit worth knowing, because changes made by Bash commands are not tracked, so Git remains your real undo. In Codex, the default `workspace-write` sandbox keeps `.git` read-only.

1. Commit or stash before the refactor, so `git diff` afterward shows only the agent's changes. A stash sets your uncommitted changes aside.
2. Start the refactor in a worktree: `claude -w refactor-auth` in Claude Code, or `codex --worktree` in Codex.
3. Name the scope in the request, meaning the folder or files allowed to change, and ask the agent to stop and ask before touching anything outside it.
4. Add a write-boundaries section to `AGENTS.md` so you stop repeating the scope rule.
5. For paths that must stay untouched during the work, add a deny rule such as `Edit(/db/migrations/**)` to `.claude/settings.json`.
6. Before you commit, run `git diff --name-only` and question every file you did not expect.

## How do I stop Claude or Codex from saying "done" when nothing was checked?

The way I handle this is to make "done" a word that needs evidence. My root rules allow the words saved, fixed, verified, published and done only after the agent has observed the matching proof, meaning the file, the command result, the readback, the live page or the visible screen. And before any "done", the checklist asks it to restate what was requested, map each requirement to evidence, open anything visual, run the relevant check, probe live links and read back any spreadsheet write.

My guardrails file also keeps a list of rules that should become hooks later, including a warning for replies that say done without evidence, and a rule only moves to a hook after its warning version has been tested. Separately, a stop hook already checks every final reply. It scans the reply for completion phrases without evidence and for phrases such as "check it yourself," and it expects a closing line that says what is needed from me.

[OpenAI's Codex guide](https://learn.chatgpt.com/guides/best-practices) lists the same idea as a standard part of `AGENTS.md`: "What done means and how to verify work."

For larger tasks I write the goal like a small contract. It names the output file, the command that verifies it, which files may change, the exact condition for stopping and what should make the agent pause and ask.

1. Add a "Done means" section to `AGENTS.md` with the check for each kind of task: the test command, the build command, the page to open.
2. Ask for the evidence in the reply: the command that ran and its output, or the path of the file it opened.
3. For multi-step work, write the goal with those five parts before starting.
4. Keep the rule as text until you have seen it fail. Then add a `Stop` hook that checks for it. Claude Code runs hooks at session, turn and tool-call events.
5. Ask for one final line in every reply that says what the agent needs from you, or that it needs nothing.

## How do I make Claude remember a correction in the next session?

I have it written down where the next session reads. Claude Code's auto memory saves notes as it works, in a `MEMORY.md` index plus one file per topic, and the docs say the first 200 lines of `MEMORY.md`, or the first 25KB, load at the start of every conversation. So that limit is a reason to keep the index short, one line per memory, with the detail in the topic file.

Corrections in my setup become memories with three parts, which are the rule, a **Why** line and a **How to apply** line. The Why line carries the reason, so a case the rule did not name can still be judged. The block between the two `---` lines at the top is the file's labels, a name, a one-line description and a type, as in this simplified version of one of mine:

```markdown
---
name: verify-before-done
description: Check the output against the original request before saying done
metadata:
  type: feedback
---

Before reporting a task complete, restate the request and match each part to evidence.

**Why:** Work passed its own checks while drifting from what was asked.

**How to apply:** Name the output and the check that proves it in the final reply.
```

I count a correction as saved only after the file that owns the rule has been changed and read back. A correction is kept in the file that owns the rule, and a rule becomes a blocking hook only after its warning version has been tested. OpenAI's Codex guide gives the same advice from the other side: "add new rules only after you notice repeated mistakes."

1. When you correct the agent, ask it to save the correction with a Why and a How to apply.
2. Ask it to read the saved file back to you.
3. The second time you make the same correction, move it into `AGENTS.md` or `CLAUDE.md`.
4. If it still recurs, consider a check that catches it automatically.

## How do I stop an AI agent from inventing facts, links or commands?

I treat every fact, link and flag as unverified until something outside the model confirms it. My source rules separate what was observed, what I instructed, what was inferred and what is still unknown. Every link is opened live before it is listed, and before the agent quotes a command-line flag, which is an option you type after a command, like `--help`, it runs that tool's help and uses only flags that appear there.

That last rule earned its keep while I prepared this article. My plan included Codex's `--full-auto` flag. Neither `codex --help` nor `codex exec --help` for Codex 0.155.0 listed it, and OpenAI's current docs describe `codex exec --full-auto` as "a deprecated compatibility path." So no step in this guide uses it.

1. Add three lines to `AGENTS.md`: open every link before listing it, run `--help` before quoting a flag, and label anything inferred.
2. Ask for the source beside each claim: a file path, a URL or the command output.
3. For anything that will be published, run a separate pass that checks each link and command, ideally in a subagent with fresh context.
4. Treat a summary of a page as a lead, then open the page itself. A summarizing fetch can paraphrase a quote or miss a line.

## How do I get an AI workflow to run the same way every time?

What I do is turn the workflow into folders. The pattern I use is ICM, the Interpretable Context Methodology, published in March 2026 by Jake Van Clief and David McDermott. [Their abstract](https://arxiv.org/abs/2603.16021) states the idea in two sentences: "Numbered folders represent stages. Plain markdown files carry the prompts and context that tell a single AI agent what role to play at each step."

My version adds what I needed for repeatable production. Each stage writes to its own output folder, and an empty output folder means the stage has not run, so there is no separate status tracker that can fall out of date. Each new run starts as a copy of a template, and a small script refuses to open a stage until the previous stage's output records a pass.

My writing lab works this way. It has five numbered stages, and each has a `CONTEXT.md` that says what to load, what to skip, what to write and when to move on. The first four stages advance on their own when their check passes, and the fifth stops and waits for me.

```text
my-workflow/
  CLAUDE.md                  map and routes only
  _templates/run/            the copy each new run starts from
  runs/2026-09-18/
    01_research/CONTEXT.md   output/
    02_outline/CONTEXT.md    output/
    03_draft/CONTEXT.md      output/
```

1. Pick one workflow you repeat every week.
2. Create numbered folders for its stages, each with a `CONTEXT.md` and an `output/` folder.
3. In each `CONTEXT.md`, write one job, what to load, what to skip, what to write and the question that must be answered yes before moving on.
4. Keep a template copy and start every run by copying it.
5. Let the files carry state. If a stage's output folder is empty, that stage has not run.
6. Later, add a script that checks the previous stage's output before the next one starts.

## How do I run Claude Code and Codex on one project without two sets of rules?

I keep one rulebook and let each tool read it. [Anthropic's memory docs](https://code.claude.com/docs/en/memory) say: "Claude Code reads `CLAUDE.md`, not `AGENTS.md`. If your repository already uses `AGENTS.md` for other coding agents, create a `CLAUDE.md` that imports it so both tools read the same instructions without duplicating them."

So my `CLAUDE.md` starts with one line, `@AGENTS.md`. That is an import line, which means Claude Code loads the whole `AGENTS.md` file into context when the session starts, and below it I keep only what is specific to Claude. Codex reads `AGENTS.md` directly. It starts with one global file in `~/.codex`, then walks from the project root down to your current folder. In [OpenAI's words](https://learn.chatgpt.com/docs/agent-configuration/agents-md), "Files closer to your current directory override earlier guidance because they appear later in the combined prompt." It skips empty files and stops adding once the combined size reaches 32 KiB by default. My global Codex file is empty, so the project's rules are the ones that count.

My eight shared skills, listed at the top, follow the same one-copy rule, so there is only one place to edit each. Each tool keeps its own progress file, and each terminal updates only its own section, so two sessions running at once do not overwrite each other's notes.

1. Put the shared rules in `AGENTS.md` at the project root.
2. Create `CLAUDE.md` with `@AGENTS.md` as its first line, and add Claude-only instructions below it.
3. Keep the shared file short enough for both tools. Codex stops at 32 KiB by default, and Anthropic targets under 200 lines per `CLAUDE.md`.
4. Keep one copy of each skill and link it in with a symlink. Personal Claude Code skills live in `~/.claude/skills/<skill-name>/`, and the docs allow that entry to be a symlink: run `mkdir -p ~/ai-skills/release-notes ~/.claude/skills`, write `SKILL.md` in `~/ai-skills/release-notes`, then run `ln -s ~/ai-skills/release-notes ~/.claude/skills/release-notes`. OpenAI's current docs list `~/.agents/skills` for personal Codex skills, so check the path for your version.
5. Give each tool, or each terminal, its own progress file.

## How does Claude know which skill or workflow a request needs?

It reads descriptions, so write your descriptions as triggers. In Claude Code, skill descriptions load into context so Claude knows what exists, and a skill's full content loads only when it is used. Codex works the same way, starting with each skill's name and description.

On top of that, my setup routes with a table of five columns: the trigger phrases, the system that owns the work, the file to open first, its status and the check that proves the work is done. The root rules tell the agent to consult it before acting. The prompt hook described earlier adds a second layer, because it matches the request against known patterns and names the entry file.

For a new kind of request, Claude also proposes the skill sequence it plans to use and waits for my yes. I can switch that off by saying "just answer."

1. Rewrite each skill description to include the phrases you actually say when you need that skill.
2. Keep a routing table with those five columns in `AGENTS.md` or in a file it points to.
3. Add one rule: consult the table before starting any task.
4. For new request types, ask the agent to propose its plan and wait for confirmation.
5. If you keep typing the same workflow name, a `UserPromptSubmit` hook can match it and inject "open this file first."

## How do I make AI-assisted writing stop sounding like AI?

I keep a list of what sounds like AI to me, and every draft in my writing lab gets scanned against it. My list holds 2 punctuation marks, 48 words and phrases, 5 patterns that need a human to judge and 7 structural shapes. The shapes include the three-item list used as a default rhythm, the paragraph that resolves into a matched pair, the tidy one-line close on every section and the sentence that announces what comes next instead of saying it. Em dashes and exclamation points fail automatically.

The list came from tells I noticed in AI drafts myself, and every voice profile my writing lab can select is bound to that file. My accepted voice profile for guides is modeled on Dorothy L. Sayers' reasoning moves, and it asks the writer to define the word the argument turns on, test it against a case the reader can check, and state the cost of a recommendation beside it. For this article, though, I asked for my own speaking voice, the way I explain things out loud, which comes from my speaking-voice skill. This article was checked against the same banned list either way.

1. Start a list from your own edits. Any word or phrase you delete twice goes on it.
2. Keep it in one file that every prompt and profile points to, so there is one copy to update.
3. Store punctuation by its Unicode codepoint, which is the code that names a character, such as U+2014 for the em dash, so the file does not fail its own check.
4. Scan each draft before you read it closely: `grep -n -i -F -f banned-words.txt draft.md`. It matches inside longer words too, which catches "seamlessly" when the list says "seamless" and costs you a few false hits. Keep blank lines out of the list, or every line will match.
5. Keep the structural shapes as a review checklist. They need judgment, and a word count will not catch them.
6. If you want a target voice, pick a writer whose reasoning you admire and write down the moves, leaving the vocabulary behind.

## Where should a human approve AI agent work, and where can the agent run alone?

I separate access from authority. One line in my root rules settles most cases: "Publishing access is not publishing authority." An agent that can log in to a publishing tool has access, but it still needs explicit authority to publish, and in my writing lab that authority is my approval of the exact draft.

At the fifth stage I approve the exact draft by its SHA-256 fingerprint. A SHA-256 fingerprint is a checksum, a long code computed from the exact bytes of a file, so if a single byte changes afterward, the fingerprint changes and the approval no longer counts. A plain "yes" from me applies only to the proposal right before it, never to a later and larger one.

Anthropic's docs add a mechanical backstop: "Deny rules block in every mode, including `bypassPermissions`."

1. List the actions in your work that are public or hard to reverse: publishing, sending, deleting, paying, pushing.
2. Put those behind deny or ask rules.
3. Let reversible local work run without prompts, such as reading files or running tests inside a worktree.
4. Approve exact output. On a Mac, `shasum -a 256 draft.md` prints a fingerprint. Record it with your approval, and approve again if it changes.
5. Write the pause condition into every larger task, meaning what should make the agent stop and ask.

## How do I stop Claude from asking me questions it could answer by looking?

I tell it where to look first, and I make asking the last step. One rule in my setup covers phrases like "you have everything you need" and "why are you asking me." When I say either, the agent must exhaust the safe files, credentials and tools in scope before asking me to take over, and it must come back with one grounded action instead of a menu of options.

When resuming, the agent reads the progress files instead of asking where we left off. Every reply ends with one line that starts "What I need from you:" followed by the real request or "Nothing right now." The stop hook also flags replies that hand verification back to me with phrases like "verify on your end."

1. Add a line to `AGENTS.md` naming where to look before asking: the project files, the progress file, the docs folder and the tool's `--help`.
2. Tell the agent to resume from the progress file without asking.
3. Separate decisions from facts: the agent should ask you only for a decision, never for a fact it can look up.
4. End every reply with one line of what is needed from you, so a real question does not hide in the middle of a status update.

## Where can I download the AI systems guide for Claude Code and Codex?

The guide condenses this article to one page per problem, with the steps and snippets together, so you have something to keep. It adds a starter `AGENTS.md` and `CLAUDE.md` pair, a memory template, a stage-folder template, a done checklist, a banned-words starter and an order for setting it all up in your first week.

[Get the AI systems guide](/ai-systems-guide/). Enter your email and the download appears on the page, which also says how your email is used.

If you change only one thing this week, I would take the correction you have typed most often and give it a home outside the chat. Then check whether it still holds a week later.
