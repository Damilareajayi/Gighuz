import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  runBrandIdentityAgent,
  runCodeDevAgent,
  runPresentationAgent,
  runPortfolioSiteAgent,
  runDataAnalysisAgent,
  runSeoContentAgent,
  runAppDeveloperAgent,
  runPowerBiTrainerAgent,
  runExcelFormulaAgent,
  runDataCleanerAgent,
  runTranscriptCleanerAgent,
  runTranscriptGeneratorAgent,
  runTranslatorAgent,
  runLegalSummarizerAgent,
  runResumeWriterAgent,
  runSocialMediaAgent,
  runEmailCopywriterAgent,
  runBusinessPlanAgent,
  AgentRunResult,
} from '../agents/marketplaceAgents';
import { AgentInvocationRequest } from '../types';

const router = Router();

const INTERNAL_AGENT_SECRET = process.env.INTERNAL_AGENT_SECRET || 'dev-internal-agent-secret';

// These endpoints are invoked machine-to-machine by services/agentInvoker.ts,
// the same way any third-party agent's endpointUrl would be — see that file
// for the request/response contract. A shared secret (sent as the
// AgentListing's authHeader) stands in for per-developer auth since GigHuz
// itself owns these listings.
function requireInternalSecret(req: Request, res: Response, next: NextFunction) {
  if (req.headers.authorization !== INTERNAL_AGENT_SECRET) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
}

router.use(requireInternalSecret);

const InvocationSchema = z.object({
  taskId: z.string(),
  title: z.string(),
  description: z.string(),
  acceptanceCriteria: z.array(z.string()),
});

function agentEndpoint(run: (req: AgentInvocationRequest) => Promise<AgentRunResult>) {
  return async (req: Request, res: Response) => {
    try {
      const data = InvocationSchema.parse(req.body);
      const { output, outputUrls } = await run(data);
      return res.json({ success: true, output, outputUrls });
    } catch (err: any) {
      if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
      console.error('[internalAgents] invocation failed:', err);
      return res.status(500).json({ success: false, error: 'Agent invocation failed' });
    }
  };
}

router.post('/brand-identity', agentEndpoint(runBrandIdentityAgent));
router.post('/code-dev', agentEndpoint(runCodeDevAgent));
router.post('/presentation', agentEndpoint(runPresentationAgent));
router.post('/portfolio-site', agentEndpoint(runPortfolioSiteAgent));
router.post('/data-analysis', agentEndpoint(runDataAnalysisAgent));
router.post('/seo-content', agentEndpoint(runSeoContentAgent));
router.post('/app-developer', agentEndpoint(runAppDeveloperAgent));
router.post('/powerbi-trainer', agentEndpoint(runPowerBiTrainerAgent));
router.post('/excel-formatter', agentEndpoint(runExcelFormulaAgent));
router.post('/data-cleaner', agentEndpoint(runDataCleanerAgent));
router.post('/transcript-cleaner', agentEndpoint(runTranscriptCleanerAgent));
router.post('/transcript-generator', agentEndpoint(runTranscriptGeneratorAgent));
router.post('/translator', agentEndpoint(runTranslatorAgent));
router.post('/legal-summarizer', agentEndpoint(runLegalSummarizerAgent));
router.post('/resume-writer', agentEndpoint(runResumeWriterAgent));
router.post('/social-media', agentEndpoint(runSocialMediaAgent));
router.post('/email-copywriter', agentEndpoint(runEmailCopywriterAgent));
router.post('/business-plan', agentEndpoint(runBusinessPlanAgent));

export default router;
