<?php

namespace Config;

class Paths
{

    public string $systemDirectory = __DIR__ . '/../../vendor/codeigniter4/framework/system';

/**
     * ---------------------------------------------------------------
     * APPLICATION FOLDER NAME
     * ---------------------------------------------------------------
     *
     * If you want this front controller to use a different "app"
     * folder than the default one you can set its name here. The folder
     * can also be renamed or relocated anywhere on your server. If
     * you do, use a full server path.
     *
     * @see http://codeigniter.com/user_guide/general/managing_apps.html
     */
    public string $appDirectory = __DIR__ . '/..';

    public string $writableDirectory = __DIR__ . '/../../writable';

    public string $testsDirectory = __DIR__ . '/../../tests';

    public string $viewDirectory = __DIR__ . '/../Views';

    public string $envDirectory = __DIR__ . '/../../';
}
