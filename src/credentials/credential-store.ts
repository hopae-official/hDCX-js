import { DCQL, rawDCQL } from '@vdcs/dcql';
import { Format } from '@vdcs/oid4vci';
import { decodeSDJWT } from '../utils';

export interface IWalletStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear?(): Promise<void>;
  keys?(): Promise<string[]>;
  generateUUID(): string;
}

const KEY_PREFIX = 'credential.';
const CHUNK_PREFIX = 'chunk.';
const CHUNK_SIZE = 1950; // under 2KB

class CredentialStore {
  constructor(private storage: IWalletStorage) {}

  private buildKey(id: string) {
    return `${KEY_PREFIX}${id}`;
  }

  private buildChunkKey(id: string, index: number) {
    return `${CHUNK_PREFIX}${id}_${index}`;
  }

  async saveCredential({
    credential,
    format,
  }: {
    credential: string;
    format: Format;
  }): Promise<string | void> {
    try {
      const id = this.storage.generateUUID();
      const jsonString = JSON.stringify({ credential, format });
      const totalSize = jsonString.length;

      const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);

      const metadata = {
        id,
        format,
        totalChunks,
        totalSize,
      };

      await this.storage.setItem(this.buildKey(id), JSON.stringify(metadata));

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, totalSize);
        const chunk = jsonString.slice(start, end);

        const chunkKey = this.buildChunkKey(id, i);
        await this.storage.setItem(chunkKey, chunk);

        return id;
      }
    } catch (error) {
      console.error('Credential 저장 실패:', error);
      throw new Error(`Failed to save credential: ${(error as Error).message}`);
    }
  }

  async getCredentialById(id: string): Promise<string | null> {
    try {
      const metadataStr = await this.storage.getItem(this.buildKey(id));
      if (!metadataStr) return null;

      const metadata = JSON.parse(metadataStr);
      const { totalChunks } = metadata;

      let reconstructedString = '';

      for (let i = 0; i < totalChunks; i++) {
        const chunkKey = this.buildChunkKey(id, i);
        const chunk = await this.storage.getItem(chunkKey);

        if (!chunk) {
          throw new Error(`청크를 찾을 수 없습니다: ${chunkKey}`);
        }

        reconstructedString += chunk;
        console.log(`청크 ${i + 1}/${totalChunks} 복원 완료`);
      }

      return reconstructedString;
    } catch (error) {
      console.error('Credential 복원 실패:', error);
      throw new Error(`Failed to load credential: ${(error as Error).message}`);
    }
  }

  async deleteCredential(id: string): Promise<void> {
    try {
      const metadataStr = await this.storage.getItem(this.buildKey(id));
      if (!metadataStr) return;

      const metadata = JSON.parse(metadataStr);
      const { totalChunks } = metadata;

      for (let i = 0; i < totalChunks; i++) {
        const chunkKey = this.buildChunkKey(id, i);
        await this.storage.removeItem(chunkKey);
      }

      await this.storage.removeItem(this.buildKey(id));
    } catch (error) {
      console.error('Credential 삭제 실패:', error);
      throw new Error(
        `Failed to delete credential: ${(error as Error).message}`,
      );
    }
  }

  async listCredentials(query?: rawDCQL): Promise<string> {
    const keys = (await this.storage.keys?.()) || [];
    const credentialKeys = keys.filter((k) => k.startsWith(KEY_PREFIX));
    const rawCredentials: Record<string, unknown>[] = [];

    for (const key of credentialKeys) {
      try {
        const metadataStr = await this.storage.getItem(key);
        if (!metadataStr) continue;

        const metadata = JSON.parse(metadataStr);
        const { id, totalChunks } = metadata;

        // 청크들을 순서대로 조회하여 합치기
        let reconstructedString = '';
        for (let i = 0; i < totalChunks; i++) {
          const chunkKey = this.buildChunkKey(id, i);
          const chunk = await this.storage.getItem(chunkKey);

          if (!chunk) throw new Error(`청크를 찾을 수 없습니다: ${chunkKey}`);
          reconstructedString += chunk;
        }

        const { credential, format } = JSON.parse(reconstructedString);

        if (format === 'dc+sd-jwt') {
          const decoded = decodeSDJWT(credential);
          const claims = decoded.claims as Record<string, unknown>;
          rawCredentials.push({
            raw: credential,
            ...claims,
          });
        } else {
          throw new Error('Unsupported format');
        }
      } catch (e) {
        console.error('Failed to parse credential:', e);
        continue;
      }
    }

    if (!query) {
      return JSON.stringify(rawCredentials);
    }

    const dcql = DCQL.parse(query);
    const result = dcql.match(rawCredentials);

    if (!result.match || !result.matchedCredentials) {
      return JSON.stringify([]);
    }

    return JSON.stringify(result.matchedCredentials.map((m) => m.credential));
  }

  clear() {
    this.storage.clear?.();
  }
}

export default CredentialStore;
