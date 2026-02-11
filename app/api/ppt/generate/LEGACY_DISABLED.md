# Legacy PPT Route Notes

The previous custom slideSpec/render pipeline has been replaced by the Gamma API workflow.
Legacy code is kept for rollback reference.

Legacy code backup (fully commented, not deleted):
- `app/api/ppt/generate/route.legacy.commented.ts`

Current active flow:
- `app/api/ppt/generate/route.js` (enqueue)
- `app/api/ppt/worker/route.js` (create Gamma generation)
- `app/api/ppt/status/route.js` (poll Gamma + finalize export upload)

Worker + status routes:
- `app/api/ppt/worker/route.js`
- `app/api/ppt/status/route.js`
