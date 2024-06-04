// Copyright 2023 Mik Bry
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { ParameterDefinition, ParameterDefinitionType } from '@/types';
import { ZodBigInt, ZodBoolean, ZodEnum, ZodNumber, ZodSchema, ZodString, z } from 'zod';

/**
 * LLama.cpp server arguments
 *   -h, --help                show this help message and exit
  -v, --verbose             verbose output (default: disabled)
  -t N, --threads N         number of threads to use during computation (default: 6)
  -tb N, --threads-batch N  number of threads to use during batch and prompt processing (default: same as --threads)
  -c N, --ctx-size N        size of the prompt context (default: 512)
  --rope-scaling {none,linear,yarn}
                            RoPE frequency scaling method, defaults to linear unless specified by the model
  --rope-freq-base N        RoPE base frequency (default: loaded from model)
  --rope-freq-scale N       RoPE frequency scaling factor, expands context by a factor of 1/N
  --yarn-ext-factor N       YaRN: extrapolation mix factor (default: 1.0, 0.0 = full interpolation)
  --yarn-attn-factor N      YaRN: scale sqrt(t) or attention magnitude (default: 1.0)
  --yarn-beta-slow N        YaRN: high correction dim or alpha (default: 1.0)
  --yarn-beta-fast N        YaRN: low correction dim or beta (default: 32.0)
  -b N, --batch-size N      batch size for prompt processing (default: 512)
  --memory-f32              use f32 instead of f16 for memory key+value (default: disabled)
                            not recommended: doubles context memory required and no measurable increase in quality
  --mlock               force system to keep model in RAM rather than swapping or compressing
  --no-mmap             do not memory-map model (slower load but may reduce pageouts if not using mlock)
  --numa                attempt optimizations that help on some NUMA systems
  -ngl N, --n-gpu-layers N
                        number of layers to store in VRAM
  -ts SPLIT --tensor-split SPLIT
                        how to split tensors across multiple GPUs, comma-separated list of proportions, e.g. 3,1
  -mg i, --main-gpu i   the GPU to use for scratch and small tensors
  -nommq, --no-mul-mat-q
                        use cuBLAS instead of custom mul_mat_q CUDA kernels.
                        Not recommended since this is both slower and uses more VRAM.
  -m FNAME, --model FNAME
                        model path (default: models/7B/ggml-model-f16.gguf)
  -a ALIAS, --alias ALIAS
                        set an alias for the model, will be added as `model` field in completion response
  --lora FNAME          apply LoRA adapter (implies --no-mmap)
  --lora-base FNAME     optional model to use as a base for the layers modified by the LoRA adapter
  --host                ip address to listen (default  (default: 127.0.0.1)
  --port PORT           port to listen (default  (default: 8080)
  --path PUBLIC_PATH    path from which to serve static files (default examples/server/public)
  -to N, --timeout N    server read/write timeout in seconds (default: 600)
  --embedding           enable embedding vector output (default: disabled)
  -np N, --parallel N   number of slots for process requests (default: 1)
  -cb, --cont-batching  enable continuous batching (a.k.a dynamic batching) (default: disabled)
    -spf FNAME, --system-prompt-file FNAME
                        Set a file to load a system prompt (initial prompt of all slots), this is useful for chat applications.
  --mmproj MMPROJ_FILE  path to a multimodal projector file for LLaVA.
 */

const LlamaCppArgumentPartialDefinitions: Record<string, Partial<ParameterDefinition>> = {
  model: { label: 'Model path', type: 'file', disabled: true },
  host: { label: 'Host', defaultValue: '127.0.0.1' },
  port: { label: 'Port', type: 'number' },
  contextSize: { label: 'Context size', defaultValue: 512, type: 'number' },
  threads: { label: 'Threads', defaultValue: 6, type: 'number' },
  threadsBatch: { label: 'Threads Batch', defaultValue: 6, type: 'number' },
  nGpuLayers: { label: 'Number of GPU layers', type: 'number' },
  ropeScaling: { label: 'Rope Scaling', defaultValue: 'linear' },
  batchSize: { label: 'Batch Size', defaultValue: 512, type: 'number' },
  timeout: { label: 'Timeout', defaultValue: 600, type: 'number' },
  verbose: { type: 'boolean' },
  path: { type: 'path' },
  ropeFreqBase: { type: 'number' },
  ropeFreqScale: { type: 'number' },
  yarnExtFactor: { type: 'number' },
  yarnAttnFactor: { type: 'number' },
  yarnBetaSlow: { type: 'number' },
  yarnBetaFast: { type: 'number' },
  memoryF32: { type: 'boolean' },
  mlock: { type: 'boolean' },
  noMmap: { type: 'boolean' },
  numa: { type: 'boolean' },
  tensorSplit: { type: 'text' },
  mainGpu: { type: 'number' },
  noMulMatQ: { type: 'boolean' },
  alias: { type: 'text' },
  lora: { type: 'text' },
  loraBase: { type: 'file' },
  embedding: { type: 'boolean' },
  parallel: { type: 'number', defaultValue: 1 },
  contBatching: { type: 'boolean' },
  systemPromptFile: { type: 'file' },
  mmproj: { type: 'path' },
};

const LlamaCppArguments: Record<string, ZodSchema> = {
  model: z
    .string()
    .nullable()
    .optional()
    .describe('model path (default: models/7B/ggml-model-f16.gguf)'),
  host: z
    .string()
    .optional()
    .default(LlamaCppArgumentPartialDefinitions.host.defaultValue as string)
    .describe('ip address to listen (default  (default:127.0.0.1)'),
  port: z.number().optional().default(8080).describe('port to listen (default  (default:8080)'),
  contextSize: z
    .number()
    .int()
    .optional()
    .default(LlamaCppArgumentPartialDefinitions.contextSize.defaultValue as number)
    .describe('size of the prompt context (default: 512)'),
  threads: z
    .number()
    .int()
    .optional()
    .default(LlamaCppArgumentPartialDefinitions.threads.defaultValue as number)
    .describe('number of threads to use during computation (default: 6)'),
  threadsBatch: z
    .number()
    .int()
    .optional()
    .default(LlamaCppArgumentPartialDefinitions.threadsBatch.defaultValue as number)
    .describe(
      'number of threads to use during batch and prompt processing (default: same as --threads)',
    ),
  nGpuLayers: z.number().int().optional().describe('number of layers to store in VRAM'),
  path: z
    .string()
    .optional()
    .default('examples/server/public')
    .describe('path from which to serve static files (default examples/server/public)'),
  verbose: z.boolean().optional().default(false).describe('verbose output (default: disabled)'),
  ropeScaling: z
    .enum(['none', 'linear', 'yarn'])
    .optional()
    .default('linear')
    .describe('RoPE frequency scaling method, defaults to linear unless specified by the model'),
  ropeFreqBase: z.number().optional().describe('RoPE base frequency (default: loaded from model)'),
  ropeFreqScale: z
    .number()
    .optional()
    .describe('RoPE frequency scaling factor, expands context by a factor of 1/N'),
  yarnExtFactor: z
    .number()
    .optional()
    .describe('YaRN: extrapolation mix factor (default: 1.0, 0.0 = full interpolation)'),
  yarnAttnFactor: z
    .number()
    .optional()
    .describe('YaRN: scale sqrt(t) or attention magnitude (default: 1.0)'),
  yarnBetaSlow: z.number().optional().describe('YaRN: high correction dim or alpha (default: 1.0)'),
  yarnBetaFast: z.number().optional().describe('YaRN: low correction dim or beta (default: 32.0)'),
  batchSize: z
    .number()
    .int()
    .optional()
    .default(512)
    .describe('batch size for prompt processing (default: 512)'),
  memoryF32: z
    .boolean()
    .optional()
    .default(false)
    .describe('use f32 instead of f16 for memory key+value (default: disabled)'),
  mlock: z
    .boolean()
    .optional()
    .default(false)
    .describe('force system to keep model in RAM rather than swapping or compressing'),
  noMmap: z
    .boolean()
    .optional()
    .default(false)
    .describe('do not memory-map model (slower load but may reduce pageouts if not using mlock)'),
  numa: z
    .boolean()
    .optional()
    .default(false)
    .describe('attempt optimizations that help on some NUMA systems'),
  tensorSplit: z
    .string()
    .optional()
    .describe(
      'how to split tensors across multiple GPUs, comma-separated list of proportions, e.g. 3,1',
    ),
  mainGpu: z.number().int().optional().describe('the GPU to use for scratch and small tensors'),
  noMulMatQ: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'use cuBLAS instead of custom mul_mat_q CUDA kernels. Not recommended since this is both slower and uses more VRAM.',
    ),

  alias: z
    .string()
    .optional()
    .describe('set an alias for the model, will be added as `model` field in completion response'),
  lora: z.string().optional().describe('apply LoRA adapter (implies --no-mmap)'),
  loraBase: z
    .string()
    .optional()
    .describe('optional model to use as a base for the layers modified by the LoRA adapter'),

  timeout: z
    .number()
    .optional()
    .default(600)
    .describe('server read/write timeout in seconds (default: 600)'),
  embedding: z
    .boolean()
    .optional()
    .default(false)
    .describe('enable embedding vector output (default: disabled)'),
  parallel: z
    .number()
    .int()
    .optional()
    .default(1)
    .describe('number of slots for process requests (default: 1)'),
  contBatching: z
    .boolean()
    .optional()
    .default(false)
    .describe('enable continuous batching (a.k.a dynamic batching) (default: disabled)'),
  systemPromptFile: z
    .string()
    .optional()
    .describe(
      'Set a file to load a system prompt (initial prompt of all slots), this is useful for chat applications.',
    ),
  mmproj: z.string().optional().describe('path to a multimodal projector file for LLaVA.'),
};

const LlamaCppArgumentsSchema = z.object(LlamaCppArguments);

const getZodType = (zodSchema: ZodSchema): ParameterDefinitionType | undefined => {
  if (zodSchema instanceof ZodString) {
    return 'text';
  }
  if (zodSchema instanceof ZodNumber) {
    return 'number';
  }
  if (zodSchema instanceof ZodBigInt) {
    return 'number';
  }
  if (zodSchema instanceof ZodBoolean) {
    return 'boolean';
  }
  if (zodSchema instanceof ZodEnum) {
    return 'select';
  }
  return undefined;
};

const LllamaCppParameterDefinitions: ParameterDefinition[] = Object.keys(LlamaCppArguments).map(
  (name) => ({
    z: LlamaCppArguments[name],
    type: LlamaCppArgumentPartialDefinitions[name]?.type || getZodType(LlamaCppArguments[name]),
    defaultValue: LlamaCppArgumentPartialDefinitions[name]?.defaultValue,
    name: LlamaCppArgumentPartialDefinitions[name]?.name || name,
    label: LlamaCppArgumentPartialDefinitions[name]?.label,
    description: LlamaCppArguments[name].description,
    disabled: LlamaCppArgumentPartialDefinitions[name]?.disabled,
  }),
);

const LlamaCppOptions = {
  verbose: ['-v', '--verbose'],
  threads: ['-t', '--threads'],
  threadsBatch: ['-tb', '--threads-batch'],
  contextSize: ['-c', '--ctx-size'],
  ropeScaling: ['--rope-scaling'],
  ropeFreqBase: ['--rope-freq-base'],
  ropeFreqScale: ['--rope-freq-scale'],
  yarnExtFactor: ['--yarn-ext-factor'],
  yarnAttnFactor: ['--yarn-attn-factor'],
  yarnBetaSlow: ['--yarn-beta-slow'],
  yarnBetaFast: ['--yarn-beta-fast'],
  batchSize: ['-b', '--batch-size'],
  memoryF32: ['--memory-f32'],
  mlock: ['--mlock'],
  noMmap: ['--no-mmap'],
  numa: ['--numa'],
  nGpuLayers: ['-ngl', '--n-gpu-layers'],
  tensorSplit: ['-ts', '--tensor-split'],
  mainGpu: ['-mg', '--main-gpu'],
  noMulMatQ: ['--no-mul-mat-q'],
  model: ['-m', '--model'],
  alias: ['-a', '--alias'],
  lora: ['--lora'],
  loraBase: ['--lora-base'],
  host: ['--host'],
  port: ['--port'],
  path: ['--path'],
  timeout: ['-to', '--timeout'],
  embedding: ['--embedding'],
  parallel: ['-np', '--parallel'],
  contBatching: ['-cb', '--cont-batching'],
  systemPromptFile: ['-spf', '--system-prompt-file'],
  mmproj: ['--mmproj'],
};

export type LlamaCppParameters = z.infer<typeof LlamaCppArgumentsSchema>;

export { LllamaCppParameterDefinitions, LlamaCppArgumentsSchema, LlamaCppOptions };
