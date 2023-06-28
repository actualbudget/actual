import * as encryption from './encryption';

afterEach(() => encryption.unloadAllKeys());

describe('Encryption', () => {
  test('should encrypt and decrypt', async () => {
    let key = await encryption.createKey({
      id: 'foo',
      password: 'mypassword',
      salt: 'salt',
    });
    await encryption.loadKey(key);

    let data = await encryption.encrypt('hello', 'foo');

    let output = await encryption.decrypt(data.value, data.meta);
    expect(output.toString()).toBe('hello');
  });
});
