import NfcManager, { Ndef, NfcTech } from 'react-native-nfc-manager';
import { DCXException } from '../utils';

class NFCService {
  constructor() {
    NfcManager.start();
  }

  async readNdef() {
    try {
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      if (tag?.ndefMessage && tag.ndefMessage.length > 0) {
        const ndefRecord = tag.ndefMessage[0];

        if (ndefRecord.tnf === 1 && ndefRecord.type[0] === 84) {
          const text = Ndef.text.decodePayload(
            new Uint8Array(ndefRecord.payload),
          );

          return text;
        }
      }
    } catch (e) {
      throw new DCXException('Failed to read NDEF', { cause: e });
    } finally {
      NfcManager.cancelTechnologyRequest();
    }
  }

  async writeNdef(value: string) {
    let result = false;

    try {
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const bytes = Ndef.encodeMessage([Ndef.textRecord(value)]);

      if (bytes) {
        await NfcManager.ndefHandler.writeNdefMessage(bytes);
        result = true;
      }
    } catch (e) {
      throw new DCXException('Failed to write NDEF', { cause: e });
    } finally {
      NfcManager.cancelTechnologyRequest();
    }
    return result;
  }
}

export { NFCService };
