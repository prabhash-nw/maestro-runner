package cli

import (
	"fmt"

	"github.com/devicelab-dev/maestro-runner/pkg/core"
	cdpdriver "github.com/devicelab-dev/maestro-runner/pkg/driver/browser/cdp"
	"github.com/devicelab-dev/maestro-runner/pkg/logger"
)

// CreateWebDriver creates a browser driver using Rod + CDP.
// Exported for library use.
func CreateWebDriver(cfg *RunConfig) (core.Driver, func(), error) {
	printSetupStep("Launching browser...")
	logger.Info("Creating web driver (headless=%v)", cfg.Headless)

	driver, err := cdpdriver.New(cdpdriver.Config{
		Headless: cfg.Headless,
		URL:      cfg.AppID,
	})
	if err != nil {
		logger.Error("Failed to launch browser: %v", err)
		return nil, nil, fmt.Errorf("launch browser: %w", err)
	}

	printSetupSuccess("Browser launched")
	cleanup := func() {
		driver.Close()
	}
	return driver, cleanup, nil
}
