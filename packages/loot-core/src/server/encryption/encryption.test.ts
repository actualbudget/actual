import * as encryption from '.';

afterEach(() => encryption.unloadAllKeys());

describe('Encryption', () => {
  test('should encrypt and decrypt', async () => {
    const key = await encryption.createKey({
      id: 'foo',
      password: 'mypassword',
      salt: 'salt',
    });
    await encryption.loadKey(key);

    const data = await encryption.encrypt('hello', 'foo');

    const output = await encryption.decrypt(data.value, data.meta);
    expect(output.toString()).toBe('hello');
  });
});
