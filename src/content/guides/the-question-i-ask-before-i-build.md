---
title: "The Question I Ask Before I Build"
type: "guide"
topics: ["ai-content-systems", "prompt-engineering"]
date: 2026-04-08
description: "One question I ask Claude before any plan. It has saved me more hours than I can count, and it has changed how I make decisions in the rest of my life too."
---

I work with AI every day. I have built full content pipelines, rewritten blog workflows, launched dashboards, shipped onboarding sites. I have made more than my share of mistakes.

One of those mistakes used to happen at the very beginning of every project.

I would describe what I wanted. Claude would generate a plan. I would say "proceed." And then we would build for three hours, only to discover at the end that the whole plan had been wrong from the start. A missing requirement. An assumption I did not flag. A constraint I forgot to mention.

I do not do that anymore.

Before I say "proceed" now, I ask one question:

**"What would go wrong with this plan?"**

That is it. That is the whole guide.

But let me show you what it does.

When I ask Claude to critique its own plan, something quietly remarkable happens. It surfaces the holes I could not see. It lists the brittle assumptions. It names the edge cases where the approach would fail. Sometimes it revises the plan before I have typed another word. Sometimes it tells me the plan is fine, and now I have confidence that it is, because the plan has been tested.

Here is the prompt I use, word for word:

```
Critique this plan and spot the weaknesses. What would go wrong?
What assumptions am I making that might be false? What edge cases
have I missed? Then improve the plan.
```

That is a handful of sentences that save me three hours of build.

A few things to know about why this works.

**It flips the posture.** By default, Claude is in produce mode. Give it a task, it gives you output. When you ask for critique, it enters a different register. It stops trying to please you and starts trying to protect you.

**It surfaces the unspoken.** Every plan has assumptions the planner did not realize they were making. Critique pulls those into the light. If the critique reveals something you did not know you were assuming, you have found a bug before it was built.

**It doubles as a plan itself.** The critiqued version of the plan is usually stronger than the first. I save the critique output and build from it, not from the original. The first plan was the draft. The critiqued plan is the real one.

I ran into something similar this week. Claude suggested an upgrade to a new version of a software tool, confidently citing a changelog. I almost ran the install. Something made me pause and ask, one more time, "what could go wrong?" The version did not exist. The changelog was a hallucination. The check took two seconds. The disaster it prevented would have taken hours to unwind.

So if there is one thing I would give to anyone starting out with AI for real work, it would be this:

**Before you build, ask what will break.**

Not because AI is dangerous, but because we are the ones steering it. And we steer better when we have already asked the question that was going to humble us anyway.

If I'm being honest, I ask this question in my own life more and more now, too. Before I make a hard decision. Before I send a message I will not be able to take back. Before I commit to a project I am not sure I can finish. What would go wrong with this plan? And then I listen for a few minutes before I move.

The end goal is not to be paralyzed. The end goal is to know what you are choosing when you choose it.

That is the whole guide.

— Lala
