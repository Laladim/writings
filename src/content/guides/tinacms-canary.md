---
title: Edit this WBL page without a Chrome extension
type: guide
topics:
  - ai-content-systems
date: 2026-10-23T00:00:00.000Z
description: An isolated canary page for testing how TinaCMS edits Writings by Lala Markdown through the browser and saves changes to Git.
---

This test page is on a separate Cloudflare address. It is not part of the live Writings by Lala website.

## What this canary proves

Open the TinaCMS admin, select this page, and click the title or body text. A saved test must change only this Markdown file on the canary branch.

## What it cannot do

This canary cannot change the live WBL domain, merge to the main branch, or publish edits to a real article.
