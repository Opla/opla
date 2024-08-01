
// Source of inspiration
// https://github.com/tauri-apps/tauri/issues/4789
// https://github.com/hoppscotch/hoppscotch/blob/286fcd2bb08a84f027b10308d1e18da368f95ebf/packages/hoppscotch-selfhost-desktop/src-tauri/src/mac/window.rs
// https://gist.github.com/charrondev/43150e940bd2771b1ea88256d491c7a9
// https://github.com/electron/electron/blob/45e5ccc55e8b13a45899bacff5cb98c9994446f2/shell/browser/native_window_mac.mm#L302

use tauri::{ App, Manager, Runtime, Window };

const WINDOW_BUTTONS_INSET_X: f64 = 14.0;
const WINDOW_BUTTONS_INSET_Y: f64 = 20.0;

pub trait WindowExt {
    #[cfg(target_os = "macos")]
    fn set_transparent_titlebar(&self);
}

struct UnsafeWindowHandle(*mut std::ffi::c_void);
unsafe impl Send for UnsafeWindowHandle {}
unsafe impl Sync for UnsafeWindowHandle {}

fn set_window_buttons_inset(window: cocoa::base::id, x: f64, y: f64) {
    use cocoa::{ appkit::{ NSView, NSWindow, NSWindowButton }, foundation::NSRect };

    unsafe {
        let close = window.standardWindowButton_(NSWindowButton::NSWindowCloseButton);
        let miniaturize = window.standardWindowButton_(NSWindowButton::NSWindowMiniaturizeButton);
        let zoom = window.standardWindowButton_(NSWindowButton::NSWindowZoomButton);

        let title_bar_container_view = close.superview().superview();

        let close_rect: NSRect = msg_send![close, frame];
        let button_height = close_rect.size.height;

        let title_bar_frame_height = button_height + y;
        let mut title_bar_rect = NSView::frame(title_bar_container_view);
        title_bar_rect.size.height = title_bar_frame_height;
        title_bar_rect.origin.y = NSView::frame(window).size.height - title_bar_frame_height;
        let _: () = msg_send![title_bar_container_view, setFrame: title_bar_rect];

        let window_buttons = vec![close, miniaturize, zoom];
        let space_between = NSView::frame(miniaturize).origin.x - NSView::frame(close).origin.x;

        for (i, button) in window_buttons.into_iter().enumerate() {
            let mut rect: NSRect = NSView::frame(button);
            rect.origin.x = x + (i as f64) * space_between;
            button.setFrameOrigin(rect.origin);
        }
    }
}

impl<R: Runtime> WindowExt for Window<R> {
    #[cfg(target_os = "macos")]
    fn set_transparent_titlebar(&self) {
        use cocoa::appkit::NSWindow;
    
        unsafe {
            let id = self.ns_window().unwrap() as cocoa::base::id;

            id.setTitlebarAppearsTransparent_(cocoa::base::YES);
            id.setTitleVisibility_(cocoa::appkit::NSWindowTitleVisibility::NSWindowTitleHidden);

            set_window_buttons_inset(id, WINDOW_BUTTONS_INSET_X, WINDOW_BUTTONS_INSET_Y);
        }
    }
}

#[cfg(target_os = "macos")]
#[derive(Debug)]
struct MacOsAppState {
    window: Window,
}

#[cfg(target_os = "macos")]
pub fn setup_mac_window(app: &mut App) {
    use cocoa::appkit::NSWindow;
    use cocoa::base::id;
    use cocoa::delegate;
    use objc::runtime::{ Object, Sel };
    use std::ffi::c_void;

    fn with_app<F: FnOnce(&mut MacOsAppState) -> T, T>(this: &Object, func: F) {
        let ptr = unsafe {
            let x: *mut c_void = *this.get_ivar("macosApp");
            &mut *(x as *mut MacOsAppState)
        };
        func(ptr);
    }

    let window = app.get_window("main").unwrap();

    app.get_window("main").unwrap().set_transparent_titlebar();

    unsafe {
        let ns_win = window.ns_window().unwrap() as id;

        let current_delegate: id = ns_win.delegate();

        extern "C" fn on_window_did_resize(this: &Object, _cmd: Sel, notification: id) {
            unsafe {
                with_app(&*this, |state| {
                    let id = state.window.ns_window().unwrap() as id;

                    set_window_buttons_inset(id, WINDOW_BUTTONS_INSET_X, WINDOW_BUTTONS_INSET_Y);
                });

                let super_del: id = *this.get_ivar("super_delegate");
                let _: () = msg_send![super_del, windowDidResize: notification];
            }
        }

        extern "C" fn on_window_did_exit_full_screen(this: &Object, _cmd: Sel, notification: id) {
            unsafe {
                with_app(&*this, |state| {
                    state.window.emit("did-exit-fullscreen", ()).unwrap();

                    let id = state.window.ns_window().unwrap() as id;
                    set_window_buttons_inset(id, WINDOW_BUTTONS_INSET_X, WINDOW_BUTTONS_INSET_Y);
                });

                let super_del: id = *this.get_ivar("super_delegate");
                let _: () = msg_send![super_del, windowDidExitFullScreen: notification];
            }
        }

        let app_state = MacOsAppState { window };
        let app_box = Box::into_raw(Box::new(app_state)) as *mut c_void;

        ns_win.setDelegate_(
            delegate!("MainWindowDelegate", {
                window: id = ns_win,
                super_delegate: id = current_delegate,
                macosApp: *mut c_void = app_box,
                (windowDidResize:) => on_window_did_resize as extern fn(&Object, Sel, id),
                (windowDidExitFullScreen:) => on_window_did_exit_full_screen as extern fn(&Object, Sel, id)

            })
        );
    }

    app.get_window("main").unwrap().set_transparent_titlebar();
}
