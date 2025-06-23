export class DCXException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DCXException';
  }
}
