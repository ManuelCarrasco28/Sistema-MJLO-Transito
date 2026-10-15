<?php

namespace Config;

use CodeIgniter\Config\BaseConfig;
use CodeIgniter\Debug\Toolbar\Collectors\Database;
use CodeIgniter\Debug\Toolbar\Collectors\Events;
use CodeIgniter\Debug\Toolbar\Collectors\Files;
use CodeIgniter\Debug\Toolbar\Collectors\Logs;
use CodeIgniter\Debug\Toolbar\Collectors\Routes;
use CodeIgniter\Debug\Toolbar\Collectors\Timers;
use CodeIgniter\Debug\Toolbar\Collectors\Views;

class Toolbar extends BaseConfig
{
/**
     * --------------------------------------------------------------------------
     * Toolbar Collectors
     * --------------------------------------------------------------------------
     *
     * List of toolbar collectors that will be called when Debug Toolbar
     * fires up and collects data from.
     *
     * @var list<class-string>
     */
    public array $collectors = [
        Timers::class,
        Database::class,
        Logs::class,
        Views::class,

        Files::class,
        Routes::class,
        Events::class,
    ];

    public bool $collectVarData = true;

/**
     * --------------------------------------------------------------------------
     * Max History
     * --------------------------------------------------------------------------
     *
     * `$maxHistory` sets a limit on the number of past requests that are stored,
     * helping to conserve file space used to store them. You can set it to
     * 0 (zero) to not have any history stored, or -1 for unlimited history.
     */
    public int $maxHistory = 20;

    public string $viewsPath = SYSTEMPATH . 'Debug/Toolbar/Views/';

/**
     * --------------------------------------------------------------------------
     * Max Queries
     * --------------------------------------------------------------------------
     *
     * If the Database Collector is enabled, it will log every query that the
     * the system generates so they can be displayed on the toolbar's timeline
     * and in the query log. This can lead to memory issues in some instances
     * with hundreds of queries.
     *
     * `$maxQueries` defines the maximum amount of queries that will be stored.
     */
    public int $maxQueries = 100;

/**
     * --------------------------------------------------------------------------
     * Watched Directories
     * --------------------------------------------------------------------------
     *
     * Contains an array of directories that will be watched for changes and
     * used to determine if the hot-reload feature should reload the page or not.
     * We restrict the values to keep performance as high as possible.
     *
     * NOTE: The ROOTPATH will be prepended to all values.
     *
     * @var list<string>
     */
    public array $watchedDirectories = [
        'app',
    ];

/**
     * --------------------------------------------------------------------------
     * Watched File Extensions
     * --------------------------------------------------------------------------
     *
     * Contains an array of file extensions that will be watched for changes and
     * used to determine if the hot-reload feature should reload the page or not.
     *
     * @var list<string>
     */
    public array $watchedExtensions = [
        'php', 'css', 'js', 'html', 'svg', 'json', 'env',
    ];

/**
     * --------------------------------------------------------------------------
     * Ignored HTTP Headers
     * --------------------------------------------------------------------------
     *
     * CodeIgniter Debug Toolbar normally injects HTML and JavaScript into every
     * HTML response. This is correct for full page loads, but it breaks requests
     * that expect only a clean HTML fragment.
     *
     * Libraries like HTMX, Unpoly, and Hotwire (Turbo) update parts of the page or
     * manage navigation on the client side. Injecting the Debug Toolbar into their
     * responses can cause invalid HTML, duplicated scripts, or JavaScript errors
     * (such as infinite loops or "Maximum call stack size exceeded").
     *
     * Any request containing one of the following headers is treated as a
     * client-managed or partial request, and the Debug Toolbar injection is skipped.
     *
     * @var array<string, string|null>
     */
    public array $disableOnHeaders = [
        'X-Requested-With' => 'xmlhttprequest',
        'HX-Request'       => 'true',
        'X-Up-Version'     => null,
    ];
}
