// Copyright 2023 mik
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
import { Command } from '@tauri-apps/api/shell';
import logger from '@/utils/logger';

const startLLamaCppServer = async (homeDirPath: string, modelsPath: string) => {
    logger.info('start LLama.cpp server');
    const command = Command.sidecar('binaries/llama.cpp/server', [
        '-m',
        `${homeDirPath}/${modelsPath}/openhermes-7b-v2.5/ggml-model-q4_k.gguf`,
    ]); // --port 8888 --host 0.0.0.0 --ctx-size 2048 --threads 4 -ngl 0 -n 512');
    const output = await command.execute();
    logger.info(output);
};

export default startLLamaCppServer;
