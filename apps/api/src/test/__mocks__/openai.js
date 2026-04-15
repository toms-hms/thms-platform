// Mock for OpenAI - tests don't test AI generation directly
class OpenAI {
  images = { generate: jest.fn().mockResolvedValue({ data: [{ url: 'https://example.com/img.png' }] }) };
  chat = { completions: { create: jest.fn().mockResolvedValue({ choices: [{ message: { content: '{"subject":"Test","bodyText":"Test","bodyHtml":"<p>Test</p>"}' } }] }) } };
}
module.exports = OpenAI;
module.exports.default = OpenAI;
