package devicelab

import (
	"github.com/devicelab-dev/maestro-runner/pkg/core"
	"github.com/devicelab-dev/maestro-runner/pkg/uiautomator2"
)

// NativeElement wraps a UIAutomator2 element to implement core.Element.
type NativeElement struct {
	elem   *uiautomator2.Element
	client DeviceLabClient
	info   *core.ElementInfo
}

// Info returns the cached element metadata.
func (n *NativeElement) Info() *core.ElementInfo { return n.info }

// Text returns the visible text content of the element.
func (n *NativeElement) Text() (string, error) { return n.elem.Text() }

// Input sends text to the element via UIAutomator2 SendKeys.
func (n *NativeElement) Input(text string) error { return n.elem.SendKeys(text) }

// Clear clears the element's text content.
func (n *NativeElement) Clear() error { return n.elem.Clear() }
