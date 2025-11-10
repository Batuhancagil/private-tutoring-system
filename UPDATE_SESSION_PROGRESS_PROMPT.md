# Prompt: Update SESSION_PROGRESS.md with Recent Changes

Update SESSION_PROGRESS.md with the most recent session's changes and push to git.

1. Read SESSION_PROGRESS.md to understand the format and instructions
2. **Extract and increment the release number**:
   - Look for a "Release" field in the most recent session entry at the top (e.g., `**Release:** 5`)
   - If found, increment it by 1 (e.g., Release 5 → Release 6)
   - If not found, start with Release 1
   - Store this release number for use in commit message and session entry
3. Check git log for commits since the last entry in SESSION_PROGRESS.md
4. Analyze the changes in those commits (use git show/diff)
5. Identify the actual feature/fix changes made (not the documentation commits)
6. Update SESSION_PROGRESS.md with:
   - **Release Number** (at the top of the new session entry, e.g., `**Release:** 6`)
   - New session date/time
   - Summary of changes
   - Detailed breakdown per commit (with hashes)
   - Files modified
   - Technical notes
   - Session statistics
7. Stage, commit, and push the updated SESSION_PROGRESS.md file
   - **IMPORTANT**: The commit message should prioritize the actual changes made, not the documentation update
   - Format: `[type]: [actual change description] - update SESSION_PROGRESS.md (Release [N])`
   - Example: If the session added horizontal scroll support, use: `fix: add horizontal scroll support for lessons table - update SESSION_PROGRESS.md (Release 6)`
   - Example: If documenting commit "feat: improve lesson type selection UI", use: `feat: improve lesson type selection UI - update SESSION_PROGRESS.md (Release 6)`
   - NOT: `docs: update SESSION_PROGRESS.md with [change description]`
   - Extract the main change from the commits being documented and use that as the primary message
   - **VERIFICATION**: After pushing, verify the release number appears in both:
     - The commit message (check with `git log -1`)
     - The SESSION_PROGRESS.md entry (check the "Release" field at the top of the new session)

**Release Number Guidelines:**
- Release numbers increment sequentially (1, 2, 3, ...)
- Each push to SESSION_PROGRESS.md should have a unique release number
- The release number must appear in:
  1. The commit message: `... - update SESSION_PROGRESS.md (Release N)`
  2. The session entry header: `**Release:** N` (at the top of the session section)
- If you cannot find a previous release number in SESSION_PROGRESS.md, start with Release 1
- The release number helps verify that the push completed successfully

**Commit Message Guidelines:**
- Start with the actual change type (feat, fix, refactor, etc.) and description
- End with "- update SESSION_PROGRESS.md (Release [N])" 
- The change description should match or summarize the main commit(s) being documented
- If multiple changes, use the most significant one or create a combined summary


