# Rate Limiting System - Digital Threat Shield

## Overview

The Digital Threat Shield implements a comprehensive rate limiting system to prevent abuse and ensure fair usage of Gemini 2.0 models for threat detection. The system provides multiple layers of protection with proper HTTP headers and graceful error handling.

## Rate Limits by Model

### Gemini 2.0 Flash Lite (`gemini-2.0-flash-lite`)
- **Per-minute limit**: 15 requests
- **Per-day limit**: 1,500 requests  
- **Burst limit**: 5 requests per 10 seconds

### Gemini 2.0 Flash Experimental (`gemini-2.0-flash-exp`)
- **Per-minute limit**: 10 requests
- **Per-day limit**: 1,000 requests
- **Burst limit**: 3 requests per 10 seconds

### Gemini 2.0 Flash (`gemini-2.0-flash`)
- **Per-minute limit**: 15 requests
- **Per-day limit**: 1,500 requests
- **Burst limit**: 5 requests per 10 seconds

### Gemini 2.0 (`gemini-2.0`)
- **Per-minute limit**: 10 requests
- **Per-day limit**: 1,000 requests
- **Burst limit**: 3 requests per 10 seconds

## Rate Limiting Features

### 1. Multi-Layer Protection
- **Per-minute limiting**: Prevents sustained abuse
- **Per-day limiting**: Prevents daily quota exhaustion
- **Burst limiting**: Prevents rapid-fire attacks (10-second windows)
- **Global limiting**: System-wide protection (10x individual limits)

### 2. Client Identification
- Combines IP address and hashed user agent
- Provides consistent identification across requests
- Resistant to simple IP rotation attempts

### 3. HTTP Headers
All responses include comprehensive rate limiting headers:

```http
X-RateLimit-Limit: 15          # Maximum requests per minute
X-RateLimit-Remaining: 12      # Remaining requests in current window
X-RateLimit-Reset: 1733854780  # Unix timestamp when limit resets
X-Cache-Status: MISS           # Cache hit/miss/error status
```

### 4. Rate Limit Exceeded Response (HTTP 429)
When limits are exceeded, clients receive detailed information:

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 15
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1733854780
Retry-After: 45

{
  "message": "Rate limit exceeded. You have made too many requests.",
  "error": "Rate limit exceeded: burst",
  "limitType": "burst",
  "retryAfter": 45,
  "resetTime": "2024-12-10T13:53:00.000Z",
  "modelUsed": "gemini-2.0-flash-lite"
}
```

## Implementation Details

### Rate Limiter Class

The `RateLimiter` class manages all rate limiting functionality:

```typescript
class RateLimiter {
  private perMinuteRequests = new Map<string, RateLimitEntry>();
  private perDayRequests = new Map<string, RateLimitEntry>();
  private burstRequests = new Map<string, RateLimitEntry>();
  private globalMinuteRequests = new Map<string, RateLimitEntry>();
}
```

### Automatic Cleanup
- Runs every 5 minutes to remove expired entries
- Prevents memory leaks from old tracking data
- Handles graceful shutdown cleanup

### Integration Points

1. **Request Processing**: Rate limits are checked before any API processing
2. **Cache Responses**: Include rate limit headers even for cached responses
3. **Error Handling**: All error responses include rate limit information
4. **Success Responses**: Include current usage information

## Testing the Rate Limiting

Use the provided test script to verify rate limiting behavior:

```bash
node test-rate-limiting.js
```

The test demonstrates:
- Normal operation within limits
- Burst protection activation
- Proper HTTP headers
- Cache hit/miss behavior
- Rate limit recovery

## Rate Limiting Logic

### Per-Minute Limits
```typescript
const minuteKey = `${clientId}_${modelName}_minute`;
const minuteRequests = this.updateCounter(this.perMinuteRequests, minuteKey, 60 * 1000);

if (minuteRequests > limits.requestsPerMinute) {
  // Return rate limit exceeded
}
```

### Burst Protection
```typescript
const burstKey = `${clientId}_${modelName}_burst`;
const burstRequests = this.updateCounter(this.burstRequests, burstKey, 10 * 1000);

if (burstRequests > limits.burstLimit) {
  // Return burst limit exceeded
}
```

### Global System Protection
```typescript
const globalKey = `global_${modelName}_minute`;
const globalRequests = this.updateCounter(this.globalMinuteRequests, globalKey, 60 * 1000);

if (globalRequests > (limits.requestsPerMinute * 10)) {
  // Return global limit exceeded
}
```

## Client Integration

### Handling Rate Limits
Clients should:

1. **Check Headers**: Monitor `X-RateLimit-Remaining` to track usage
2. **Handle 429 Responses**: Implement exponential backoff
3. **Use Retry-After**: Wait the specified time before retrying
4. **Monitor Reset Times**: Plan requests around limit resets

### Example Client Code
```javascript
async function makeRequest(content) {
  try {
    const response = await fetch('/api/detect-threat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    
    // Check rate limit headers
    const remaining = response.headers.get('X-RateLimit-Remaining');
    console.log(`Requests remaining: ${remaining}`);
    
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      console.log(`Rate limited. Retry after ${retryAfter} seconds`);
      // Implement retry logic
    }
    
    return response.json();
  } catch (error) {
    console.error('Request failed:', error);
  }
}
```

## Performance Impact

The rate limiting system is designed for minimal performance impact:

- **In-memory storage**: Fast lookups using Map data structures
- **Efficient cleanup**: Periodic cleanup prevents memory growth
- **Sliding windows**: Accurate rate limiting without constant timer resets
- **Header caching**: Rate limit headers calculated once per request

## Security Considerations

1. **Client Identification**: Uses IP + User-Agent hash for identification
2. **Memory Protection**: Automatic cleanup prevents memory exhaustion
3. **Global Limits**: Prevents system-wide abuse
4. **Graceful Degradation**: Continues serving within limits during attacks

## Monitoring and Observability

Rate limiting activities are logged with detailed information:

```
🛡️ Checking rate limits for model: gemini-2.0-flash-lite
✅ Rate limit check passed. Remaining requests: 12
⚠️ Rate limit exceeded for gemini-2.0-flash-lite: burst limit
```

This comprehensive rate limiting system ensures the Digital Threat Shield remains available and responsive for all users while preventing abuse and maintaining service quality.
