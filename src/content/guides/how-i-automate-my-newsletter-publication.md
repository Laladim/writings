---
title: "How I Automate My Newsletter Publication?"
type: "guide"
topics: ["automation", "newsletter-craft", "ai-content-systems"]
date: 2026-09-17
description: "The steps Claude Code runs between my one-line instruction and a verified Beehiiv draft of Beyond Banks, and the errors from one real run to plan for before you automate your own newsletter."
image: "https://res.cloudinary.com/dimapmlre/image/upload/v1789785636/state-heroes/writings-v1-how-i-automate-my-newsletter-publication.png"
thumbnailTreatment: "blur-contain"
---

So, the line that I type to make my newsletter is actually the smallest part of making it, and I want to start with that line, because when someone only sees it, the whole thing can look very simple.

A Beyond Banks edition starts with one instruction that I give to [Claude Code](https://code.claude.com/docs/en/overview). I use the [`/goal` command](https://code.claude.com/docs/en/goal), which keeps Claude working across turns of the conversation until a stated condition is met, and the instruction looks like this:

```
/goal create newsletter draft on Beehiiv
```

If we only look at the beginning and the ending, meaning that line and the finished draft in [Beehiiv](https://www.beehiiv.com/), it can look like I said one sentence and then Claude Code produced a complete newsletter for me. But that is not really what happens. That one sentence is only the starting point of a much longer process. Between the instruction that I type and the newsletter that I eventually see inside Beehiiv, Claude has to find the right workflow, gather and choose the stories, research them, write the draft, make the image, check the claims and citations, place everything inside Beehiiv, and then read it all back to confirm that the right newsletter is really there.

So what actually has to happen between that line and a draft that I can trust? The way I would describe it is that nine stages run in a fixed order, and each stage before post-publish leaves a checked file for the next one. And the draft only counts as done after a readback, which means Claude pulls back what Beehiiv actually stored and compares it with what it sent. I am going to use the September 10 edition to show you every step up to that verified draft. That same run also produced more than a dozen errors, and instead of mixing them into the steps, I gathered them at the end, together with what they taught me.

I also want to be clear that my setup is my own. The files, the rules, and the scripts were built for Beyond Banks, so you cannot copy them as they are. What the run relied on was Claude Code, Beehiiv tools that Claude can call, a Google Sheet of candidate news stories, an image generator, an edition template of numbered stages, and a verifier script. What carries over to your own newsletter is the shape of the process, and the errors show you what you should plan for.

## Step 1: I type one line

The line tells Claude the result that I want, which is a newsletter draft inside Beehiiv. But the words that I typed are not yet the actual program. They are more like my starting specification, because I am telling Claude Code the outcome that I want, but I am not personally telling it every individual action that will be required to produce that outcome.

So Claude still has to work out which newsletter I mean, who the newsletter is for, where the possible stories are stored, what information it is allowed to use, how the newsletter should be written, which quality checks it has to pass, where the draft should go, and where it has to stop.

The line says draft. It does not say that Claude is allowed to schedule or send anything, because that final decision still belongs to me.

And this is why the quality of the instruction still matters. If my instruction is unclear, the system can still start working, run many actions, and produce something, but that does not mean it produced the thing that I actually intended.

## Step 2: Claude reads the context from files

<a href="/post-images/how-i-automate-my-newsletter-publication/slide-03.webp"><img src="/post-images/how-i-automate-my-newsletter-publication/slide-03.webp" alt="Diagram titled Context lives outside the chat window. Registries and profiles, stage instructions, external assets and previous editions feed the current workspace, with a warning that loading everything fails." width="1600" height="894" loading="lazy" decoding="async"></a>

When I first explained this, I said that Claude Code puts together the whole context, and I still think that is the right general idea, but I want to explain it more accurately. Claude does not simply remember everything about every newsletter that I have made, and it does not need to load every file that exists in my system.

What it does is it starts with the entry instructions and the registries, which are the index files that list what exists and who owns it, so it can identify which workspace actually owns Beyond Banks. Then it reads that workspace: the publication profile, the instructions for the current stage, and the stable rules that the stage needs, like which sources are acceptable and who has authority over the final action.

It also checks earlier editions, so that a story the newsletter already covered does not slip back in just because the new headline uses different words.

So the context is not only what appears inside my current conversation with Claude. A large part of it is already stored in files, and this matters because a conversation can be compacted, which means summarized to free space, or it can be interrupted, and the workflow should not depend only on what the model still remembers from the chat. Context is also a limited resource, so the system has to load the right information for the current stage and leave the rest on disk, instead of collecting everything it can find.

## Step 3: The goal becomes many small actions

<a href="/post-images/how-i-automate-my-newsletter-publication/slide-04-diagram.webp"><img src="/post-images/how-i-automate-my-newsletter-publication/slide-04-diagram.webp" alt="Diagram titled Intention fractures into machine-readable loops. A natural-language intention branches to scripts, APIs, Sheets, file search, image generation and the Beehiiv API, and the results return to Claude Code." width="1600" height="1181" loading="lazy" decoding="async"></a>

This is the part where I would correct my first understanding. Claude Code does not normally take my sentence and turn the whole newsletter process into one machine-readable program. What it actually does, throughout the run, is translate my intention into many smaller actions, each in a form that a machine or a tool can run.

It runs a script to create the edition record. It reads rows from the Google Sheet. It hands the news screening to a subagent, which is a separate agent given one job and its own instructions. It opens an announcement or an SEC filing, which is a company's report to the U.S. securities regulator. It writes the HTML, which is the code that the newsletter's layout is built from. It sends a prompt to an image generator, and it calls the Beehiiv tools.

And after every action, the result comes back to Claude in a form that it can read. Claude sees whether the command succeeded, what the sheet returned, whether the image passed its check, or what Beehiiv says it stored, and then it uses that result to decide what action should happen next. So there is not only one translation from English into code. There is a continuous loop where my intention is broken into smaller actions, the tools execute those actions, and the results come back so that Claude can keep making decisions.

## Step 4: A script stamps the edition from a template

<a href="/post-images/how-i-automate-my-newsletter-publication/slide-05-timeline.webp"><img src="/post-images/how-i-automate-my-newsletter-publication/slide-05-timeline.webp" alt="Timeline of the nine stages made from a template: intake, source selection, research, routing, draft, quality review, package, delivery and post-publish." width="1600" height="580" loading="lazy" decoding="async"></a>

For the actual newsletter, those smaller actions are not supposed to happen in any random order. Every edition starts from a template, and a script copies that template into a new edition record with the nine numbered stages already in place: intake, source selection, research, routing, draft, quality review, package, delivery, and post-publish.

The edition record is a folder with one subfolder for each stage, so the folder itself tells Claude which stage it is in, what that stage is supposed to produce, and what has to exist before the next stage can begin. For example, the drafting stage should not begin only because Claude found an interesting headline.

A verifier, which is a script that checks the recorded files, fields, and stage order, confirms each handoff. But a message saying "verification passed" needs to be read carefully, because the verifier does its checking only when it runs and it does not by itself stop Claude's actions, so a pass means just that those checks passed. At the beginning of the September 10 run, the verifier said verification passed and the pickup, meaning the next stage to run, was Stage 02. That meant the intake record was valid. It did not mean that the newsletter already existed.

## Step 5: The nine stages run in order

### 1. Intake

Intake writes the edition's assignment and a receipt. The receipt records the inputs, the outputs, the checks, and the exit result, so the next stage starts from a written record instead of from a memory.

### 2. Source selection

Here, two things happen at the same time. A researcher subagent screens the news feed, and its handoff gives it the date window, the stories to exclude, the ranking rules, and the report that it must return. While it works, the main Claude checks the archive for earlier coverage and opens primary sources, like announcements and SEC filings.

But working in parallel does not remove the order of the workflow. The main Claude is the coordinator, and even when the researcher says that its work is complete, the coordinator still has to receive the actual report, inspect the candidates, confirm the sheet row references, and decide whether the recommendation should be accepted. In the September 10 run, the researcher preferred one story, but the coordinator chose another one, because the second had stronger primary evidence and was more relevant to the newsletter's readers. That decision is written into a candidate-set file, and in this run, the research stage opened only after that file existed and its receipt passed.

### 3. Research

Research produces two files. The research packet holds the supported claims and keeps the unresolved ones marked as unresolved. The source ledger records each claim's source, its publication date, the source type, any access limits, and even the material that was deliberately left out of citation. It also labels reports that all repeat one company announcement, which helps keep several rewrites of one press release from being counted as independent confirmation.

Claude also probes the candidate links to see whether they open. And the procedure calls for an analysis row for each selected story in the Google Sheet, which is then read back to confirm that every column is filled, but in this run, only the lead story's row was observed.

### 4. Routing

Routing records which story leads and which ones support it, and where the unused candidates should go. It also carries limits into the draft. In this run, those limits included keeping an announced deal's closing status accurate and qualifying any causal claim that the evidence did not support.

### 5. Draft

Claude builds the HTML draft from the newsletter's HTML layout template and the research packet. The hero image, which is the main picture at the top, goes through its own loop. First, the prompt has to pass a gate, which is a check that must pass before the next step can run. Then the image is generated and downloaded, its palette is checked, it is opened in full and as a detail crop, and its row in the image queue, the list that tracks image jobs, is read back.

An audit counts the sources and the citations and flags length and wording. Claude also renders the draft in a browser, because text checks cannot prove how the newsletter looks to a reader.

### 6. Quality review

A separate reviewer reads the complete edition, together with its supporting stories, and scores it for the newsletter's lender audience. At the same time, the coordinator checks the quotations and figures against the source pages. The fixes go back into the draft, and then the fixed draft goes to a second reviewer.

### 7. Package

Claude pulls statistics for previous posts before it picks the subject line and the preview text. Then it writes a package manifest that ties the reviewed draft, the image, the video module, which is the video section of the newsletter, the audience settings, and the metadata into one handoff for delivery.

### 8. Delivery

Claude duplicates the previous edition in Beehiiv so it can reuse its layout, uploads the hero, and sets the new title, subject line, preview text, and audience. Then it replaces the body with the new edition and reads the draft back from Beehiiv. Delivery is done only when what Beehiiv stored matches what was sent.

### 9. Post-publish

This stage is reserved for work after publication, so it only starts after I publish.

## Step 6: I review and decide

Claude is allowed to create and verify an unscheduled Beehiiv draft. It is not allowed to decide that the newsletter should be sent to real subscribers. I still have to review what the reader will see and decide whether I am willing to schedule or publish it.

So the human is not only the person who gives the first instruction. Claude runs under rules that people wrote, and I am the one who defines what good means and which rule wins when two rules conflict, and the exceptions that the automated checks cannot settle are mine to evaluate. In the September 10 run, Claude still made some of those calls itself, including a length exception that I list in the errors below. And the responsibility for what happens once the newsletter is sent stays with me.

## The errors from one real run

These come from my record of the September 10 edition. The timed notes run from 2:24 pm to 3:34 pm, Manila time, but the first steps were not timed, so I cannot give you the full length of the run. And I think this is one of the most important parts of the process, because when something failed, the workflow did not just move forward as if the missing information did not matter.

### Access failures

- **The Google Sheets connection failed.** Claude switched to an authorized service account, which is a separate account set up for automated access, and it got the rows. But that did not mean that the original connection had been repaired. It only meant that Claude found another valid route to get the data, and the record keeps those two facts apart.
- **The archive had moved.** The duplicate check failed because two archive files were no longer where the researcher expected them. A failed lookup cannot prove that a story was never covered, so Claude found the moved archive through the configured output location and searched all 423 records.
- **The researcher's report could not be fetched.** Retrieving it by its task ID, the label the system gave the researcher's job, was rejected, even though the report existed. The research itself was still there, so instead of repeating the work, Claude inspected the researcher's transcript. Its first extraction script found no report at all, because the report sat inside the body of a message that the researcher had sent, away from where the script looked. Claude then recovered about 20,000 characters of the original report without rerunning the research.
- **Links refused access.** The link probe returned 23 successes, five 403 refusals, where a site denied access, and one 429 rate limit, where a site refused because too many requests came too fast. Those failures did not prove that the stories had no evidence. They only described what happened through that particular access route. A rate limit can justify waiting and retrying, while a refusal may need a primary source or another authorized route. At delivery, four links that one tool could not open did open through a different fetch tool.
- **A download failed quietly.** Downloading the two leading video candidates for the video module returned 403, while their captions and metadata came through, and the tool reported no overall error. Captions alone could not show that the visual check passed.

### Checks that proved less than they seemed

- **A verifier passed with a gap.** After research, the file-based verifier reported a pass and pointed to the next stage. But at that point, only the lead story's analysis row had been observed. The rows for the three supporting stories had not been observed in the same way, so the structure passed while part of the requirement was still unconfirmed.
- **The timestamps were wrong.** Some stage receipts said the work finished at times later than the actual clock. The verifier still passed them, because it checked whether the required fields existed, and it did not check whether every time accurately described what happened.
- **Beehiiv looked finished before it was.** Claude duplicated the previous edition, and the draft showed the new title, subject line, preview, hero, and audience, and Beehiiv reported draft status with no scheduled time. If Claude had stopped there, it could have said that the new newsletter draft existed. But when it read the content back, the body was still the previous edition. So Claude checked the replacement body's length and its hash, which is a fingerprint of the file's exact contents, submitted it, and received `content_updated: true`. But even that response was not the final proof, because it only showed that Beehiiv accepted an update. Claude still had to retrieve the stored content again, and that fresh readback matched all 19,601 text characters and kept the 29 sources, the 88 citation pairs, the hero, the video, and the sections that repeat in every edition. After allowing for Beehiiv's own formatting changes, the only remaining difference was an empty paragraph at the end.
- **The final report named the wrong stage.** Claude's closing message called its files Stage 09 outputs, but they were actually written under delivery, and Stage 09 is reserved for work after publication.

### Drafting and review errors

- **The first draft was not ready.** The first HTML draft existed, but it still had a placeholder where the hero image should go, it ran long, and the audit flagged its wording. So the existence of the file only showed that drafting had started. Later, Claude accepted a draft that was over its word target and cited the previous edition as the reason. That was an exception Claude chose rather than a length check it passed.
- **The image prompt was rejected.** The image process had its own correction loop. The gate caught a wrong image-type value and missing wording about the size of the main subject, and Claude fixed both and reran the gate until it passed.
- **An edit did not land.** Claude's first attempt to shorten the draft failed because its replacement text did not match the file. The rebuilt draft kept the same content hash, which confirmed that the edit had not landed.
- **A fix created a new error.** After the draft was rebuilt, another problem appeared, because the new version put citation markers side by side. The next rebuild cleared them. One change can remove a warning and add a different defect, which is why the checks run again after an edit.
- **Two source errors surfaced during review.** The coordinator found a quotation with an extra word and a figure that was credited to the wrong source, and it corrected both. Because the draft changed after the review began, the review had to cover the revised version.
- **The reviewer asked for revisions.** It found that one market-size figure needed stronger support and that one comparison needed its own citation. Claude removed the unsupported number, added the missing citation, rebuilt the draft, and sent the whole revised newsletter to a second reviewer.

This is why I do not think the work is simply "the AI generated a newsletter." The actual process is closer to writing, testing, receiving a specific failure, correcting the exact part that failed, and then testing the changed version again, because one correction can introduce another problem.

### Rules that disagreed

This is the part where I do not want to give too much authority to the AI. The second reviewer confirmed both fixes and found nothing new that it had to fix, but it still asked for a revision. The edition's score had cleared the minimum that my newsletter procedure sets, but it fell short of the reviewer's own, higher pass mark. So the coordinator had to apply the newsletter's governing rule and record why the remaining notes were optional or did not apply. Even when Claude can run the process and perform the checks, it still operates under rules that people created, and those rules can sometimes disagree with one another.

### Too much context, too early

There was even a point at the start of the run where Claude loaded later-stage material before it needed it. That was not automatically helpful, because that material took up context before drafting had even begun.

## What you need to know before you automate yours

<a href="/post-images/how-i-automate-my-newsletter-publication/slide-12.webp"><img src="/post-images/how-i-automate-my-newsletter-publication/slide-12.webp" alt="Diagram titled Natural language is merely the new syntax. Code braces become a speech bubble bridged to four pillars labeled persistent context, formal tool execution, evidence recovery and human judgment." width="1600" height="894" loading="lazy" decoding="async"></a>

My closing slide names the four things that this whole process rests on: persistent context, formal tool execution, evidence recovery, and human judgment.

1. **Write the context down.** Your instructions, stage rules, source rules, and past editions belong in files that the agent reads, where they survive a compacted or interrupted chat.
2. **Give each stage only what it needs.** Loading everything early spends context before the real work even starts.
3. **Make every stage leave a file.** The next stage should depend on that file, and not on the agent saying that it finished.
4. **Treat "complete" as a claim.** An agent saying that it is done is weaker evidence than its actual report, and a link that opens may still not support the claim that you cite it for.
5. **Read the failure before choosing the fix.** The type of failure tells you whether to retry, use another authorized route, recover work that already exists, record the limit, or stop.
6. **Know what your verifier checks.** A verifier can only test what somebody designed it to test. Mine confirmed that the fields existed, and it missed that some of the timestamps were false.
7. **Read back from the platform your readers use.** An accepted update only means that the request went through. You still have to read the draft back to see what your readers will actually get.
8. **Keep the send decision.** Let the system build and verify the draft, and then decide yourself whether it goes out.

The end goal for me is not to disappear from the work. My end goal is to move from performing every technical instruction by hand into directing, inspecting, and improving a system that can perform those instructions, while the evidence and the final judgment stay visible.

So, if you want to automate your own newsletter this way, I would say you are ready when you can say where your context lives and which file each stage has to leave behind, and when you have a way to read the finished draft back from the platform. Until then, one line can still produce something, but you will have no reliable way to tell whether it is the newsletter that you actually meant.
