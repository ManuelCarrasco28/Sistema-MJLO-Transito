<?php

namespace Tests\Unit;

use App\Services\AuthSession;
use CodeIgniter\Test\CIUnitTestCase;

final class AuthSessionRateLimitTest extends CIUnitTestCase
{
    public function testCuentaBloqueaYReinicia(): void
    {
        $key = bin2hex(random_bytes(12));
        try {
            $this->assertNull(AuthSession::checkRateLimit('test', $key, 2));
            $this->assertNull(AuthSession::checkRateLimit('test', $key, 2));
            $this->assertNotNull(AuthSession::checkRateLimit('test', $key, 2));
            AuthSession::clearRateLimit('test', $key);
            $this->assertNull(AuthSession::checkRateLimit('test', $key, 2));
        } finally {
            @unlink(WRITEPATH . 'rate_limits_test/' . hash('sha256', $key) . '.json');
        }
    }
}
