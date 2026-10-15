<?php

namespace Config;

class WorkerMode
{
/**
     * Persistent Services
     *
     * List of service names that should persist across requests.
     * These services will NOT be reset between requests.
     *
     * Services not in this list will be reset for each request to prevent
     * state leakage.
     *
     * Recommended persistent services:
     * - `autoloader`: PSR-4 autoloading configuration
     * - `locator`: File locator
     * - `exceptions`: Exception handler
     * - `commands`: CLI commands registry
     * - `codeigniter`: Main application instance
     * - `superglobals`: Superglobals wrapper
     * - `routes`: Router configuration
     * - `cache`: Cache instance
     *
     * @var list<string>
     */
    public array $persistentServices = [
        'autoloader',
        'locator',
        'exceptions',
        'commands',
        'codeigniter',
        'superglobals',
        'routes',
        'cache',
    ];

/**
     * Reset Event Listeners
     *
     * List of event names whose listeners should be removed between requests.
     * Use this if you register event listeners inside other event callbacks
     * (rather than at the top level of Config/Events.php), which would cause
     * them to accumulate across requests in worker mode.
     *
     * @var list<string>
     */
    public array $resetEventListeners = [];

    public bool $forceGarbageCollection = true;
}
