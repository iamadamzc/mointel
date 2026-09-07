/**
 * Model-agnostic interpretation contract.
 *
 * The pipeline depends on this interface, never on a provider or a model name.
 * Tier selection is a call-site decision; swapping providers should not touch
 * the queue, the validator or the dossier schema.
 */

import type { ResearchEvidenceBundle } from './bundle';
import type { ResearchDossier } from '../types';

export interface InterpretUsage {
  inputTokens: number | null;
  outputTokens: number | null;
  cachedInputTokens: number | null;
}

export interface InterpretResult {
  dossier: ResearchDossier | null;
  model: string;
  usage: InterpretUsage;
  durationMs: number;
  /**
   * The tier that ACTUALLY served the request, when the response says.
   *
   * The desk sends no `service_tier`, has no SDK client, no constructor default
   * and no wrapper, so the documented chain is `auto` -> project setting ->
   * `default`. THAT IS AN INFERENCE FROM AN ABSENCE, and the tiers span a
   * factor of four: Batch and Flex are half, Fast is double.
   *
   * OpenAI returns the tier that served the request. Reading it turns the
   * inference into a measurement, and the project setting is on a console
   * nobody here can see.
   */
  serviceTier: string | null;
  /** Populated when interpretation could not produce a dossier. */
  error: string | null;
}

export interface RepairRequest {
  bundle: ResearchEvidenceBundle;
  /** The output that failed validation, verbatim. */
  previous: ResearchDossier;
  /** Explicit validation errors, quoted back to the model. */
  errors: string;
}

/**
 * A disputed conclusion handed to the escalation tier.
 *
 * The human conclusion travels as a labelled prior opinion, never as evidence.
 * Adjudication means re-deciding from the sources — a model that simply picked
 * whichever side sounded more confident would add cost without adding rigour.
 */
export interface AdjudicationRequest {
  bundle: ResearchEvidenceBundle;
  /** What the default tier concluded, verbatim. */
  terra: ResearchDossier;
  /** Deterministic validation findings against that output. */
  validation: string;
  field: 'structure' | 'catalyst' | 'cycle';
  /** The human-reviewed conclusion, explicitly not a source fact. */
  humanConclusion: string;
  automaticConclusion: string;
}

export interface ResearchInterpreter {
  readonly name: string;
  readonly available: boolean;
  /** Model this interpreter will use, for provenance. */
  readonly model: string;
  interpret(bundle: ResearchEvidenceBundle): Promise<InterpretResult>;
  repair(request: RepairRequest): Promise<InterpretResult>;
  /** Re-decides a disputed field from the evidence. */
  adjudicate(request: AdjudicationRequest): Promise<InterpretResult>;
}

/** Used when no model key is configured. Collection still works without it. */
export class NoopInterpreter implements ResearchInterpreter {
  readonly name = 'noop';
  readonly available = false;
  readonly model = 'none';

  async interpret(): Promise<InterpretResult> {
    return {
      dossier: null,
      model: 'none',
      usage: { inputTokens: null, outputTokens: null, cachedInputTokens: null },
      durationMs: 0,
      serviceTier: null,
      // Not an error condition: sources are still collected and stored, and
      // interpretation simply remains unavailable rather than fabricated.
      error: 'no interpreter configured',
    };
  }

  async repair(): Promise<InterpretResult> {
    return this.interpret();
  }

  async adjudicate(): Promise<InterpretResult> {
    return this.interpret();
  }
}
