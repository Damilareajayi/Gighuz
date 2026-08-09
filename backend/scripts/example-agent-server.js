// Reference implementation of the GigHuz agent invocation contract.
// Run it locally (`node scripts/example-agent-server.js`) and register
// http://localhost:4100/invoke as an AgentListing's endpointUrl to test
// the full assign -> invoke -> audit -> payout loop end to end.
//
// Real agent developers: this is the entire integration surface. Your
// endpoint receives a POST with { taskId, title, description,
// acceptanceCriteria } and must respond with { success, output, outputUrls? }.
const express = require('express');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4100;

app.post('/invoke', (req, res) => {
  const { taskId, title, description, acceptanceCriteria } = req.body;
  console.log(`[example-agent] Received task ${taskId}: ${title}`);

  // A real agent would actually do the work here (call an LLM, run a
  // pipeline, whatever). This one just fabricates a plausible-looking
  // deliverable so the contract can be exercised end to end.
  const output = [
    `Completed: ${title}`,
    '',
    description,
    '',
    'Acceptance criteria addressed:',
    ...(acceptanceCriteria || []).map((c, i) => `${i + 1}. ${c} — done.`),
  ].join('\n');

  res.json({ success: true, output, outputUrls: [] });
});

app.listen(PORT, () => console.log(`[example-agent] Listening on http://localhost:${PORT}/invoke`));
