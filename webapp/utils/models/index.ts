// Copyright 2024 mik
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

// Made using : https://stefanterdell.github.io/json-schema-to-zod-react/
import { SafeParseReturnType, z } from 'zod';
import { Model as ModelType } from '@/types';
import { readTextFile } from '../backend/tauri';

const InnerModelSchema: any = z.lazy(() => z.object({
    id: z.string().describe("model's unique identifier").optional(),
    name: z.string().describe("The name of the model"),
    created_at: z
        .string()
        .datetime()
        .describe("creation date of the model")
        .optional(),
    updated_at: z
        .string()
        .datetime()
        .describe("updated date of the model")
        .optional(),
    base_model: z.string().describe("The base model of the model").optional(),
    title: z.string().describe("The title of the model").optional(),
    description: z
        .string()
        .describe("The description of the model")
        .optional(),
    summary: z.string().describe("The summary of the model").optional(),
    version: z.string().describe("The version of the model").optional(),
    creator: z
        .string()
        .describe("The creator of the model, it is a unique identifier")
        .optional(),
    author: z
        .union([
            z.string(),
            z.object({
                name: z.string().optional(),
                email: z.string().email().optional(),
                url: z.string().url().optional(),
            }),
        ])
        .optional(),
    publisher: z
        .union([
            z.string(),
            z.object({
                name: z.string().optional(),
                email: z.string().email().optional(),
                url: z.string().url().optional(),
            }),
        ])
        .optional(),
    license: z
        .union([
            z.enum([
                "MIT",
                "Apache-2.0",
                "GPL-3.0",
                "BSD-3-Clause",
                "BSD-2-Clause",
                "LGPL-3.0",
                "LGPL-2.1",
                "MPL-2.0",
                "CDDL-1.0",
                "EPL-2.0",
                "AGPL-3.0",
                "Unlicense",
                "Other",
            ]),
            z.object({
                name: z.string().optional(),
                url: z.string().url().optional(),
            }),
        ])
        .optional(),
    languages: z.union([z.string(), z.array(z.string())]).optional(),
    tags: z.union([z.string(), z.array(z.string())]).optional(),
    recommendations: z
        .string()
        .describe("The recommendations of the model")
        .optional(),
    recommended: z.boolean().describe("The model is recommended").optional(),
    deprecated: z.boolean().describe("The model is deprecated").optional(),
    private: z.boolean().describe("The model is private").optional(),
    featured: z.boolean().describe("The model is featured").optional(),
    model_type: z
        .enum(["llama", "mistral", "phi-msft"])
        .describe("The type of the model")
        .optional(),
    library: z
        .enum(["PyTorch", "GGUF"])
        .describe("The library of the model")
        .optional(),
    tensor_type: z
        .enum(["float32", "float16", "float8"])
        .describe("The type of tensors used in the model")
        .optional(),
    quantization: z
        .enum([
            "Q2_K",
            "Q3_K_S",
            "Q3_K_M",
            "Q3_K_L",
            "Q4_0",
            "Q4_1",
            "Q4_K_S",
            "Q4_K_M",
            "Q5_0",
            "Q5_1",
            "Q5_K_S",
            "Q5_K_M",
            "Q6_K",
            "Q8_0",
        ])
        .describe("The quantization used in the model")
        .optional(),
    bits: z
        .number()
        .int()
        .describe("The number of bits used in the model")
        .optional(),
    size: z
        .number()
        .describe("The size in Go of the model's file")
        .optional(),
    max_ram: z
        .number()
        .describe("The maximum RAM used for the model")
        .optional(),
    repository: z
        .union([
            z.string().url(),
            z.object({
                url: z.string().url().optional(),
                name: z.string().optional(),
            }),
        ])
        .optional(),
    download: z
        .union([
            z.string().url().optional(),
            z.string().optional(),
            z.object({
                url: z.string().url().optional(),
                name: z.string().optional(),
            }),
        ])
        .optional(),
    documentation: z
        .union([
            z.string().url(),
            z.object({
                url: z.string().url().optional(),
                name: z.string().optional(),
            }),
        ])
        .optional(),
    paper: z
        .union([
            z.string().url(),
            z.object({
                url: z.string().url().optional(),
                name: z.string().optional(),
            }),
        ])
        .optional(),
    include: z.array(InnerModelSchema).optional(),
    system: z
        .string()
        .describe(
            "The system prompt is a textual intruction to initialize a conversation using the model"
        )
        .optional(),
}));

export const ModelSchema = z
    .object({
        _version: z.literal("1.0.0"),
        _schema: z.literal("opla.ai/llm/model").optional(),
    })
    .and(InnerModelSchema
    );

export type Model = z.infer<typeof ModelSchema>;

const validateModel = (data: unknown): SafeParseReturnType<unknown, Model> =>
    ModelSchema.safeParse(data);

const validateModelsFile = async (file: string): Promise<SafeParseReturnType<unknown, Model>> => {
    try {
        const data = await readTextFile(file, false);
        return validateModel(JSON.parse(data));
    } catch (error: any) {
        return { success: false, error: error.toString() };
    }
}

const importModel = (model: Model): ModelType => {
    const now = new Date().getMilliseconds();
    const download = model.download || model.include?.[0]?.download || "";
    return {
        id: model.id,
        name: model.name,
        createdAt: model.created_at || now,
        updatedAt: model.updated_at || now,
        base_model: model.base_model,
        title: model.title,
        description: model.description,
        summary: model.summary,
        version: model.version,
        creator: model.creator,
        download,
    };
}

export { validateModel, validateModelsFile, importModel };