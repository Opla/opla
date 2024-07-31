// Copyright 2024 Mik Bry
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

use tauri::{ CustomMenuItem, Menu, MenuEntry, MenuItem, Submenu };

pub struct Ui {}

impl Ui {
    pub fn setup_menu() -> Menu {
        let os_default_menu = tauri::Menu::os_default("Opla");
        let mut menu = Menu::new();
        for item in &os_default_menu.items {
            if let MenuEntry::Submenu(submenu) = item {
                if submenu.title == "File".to_owned() {
                    println!("File menu {:?}", menu);
                    let recents_menu = Menu::new()
                        .add_item(
                            CustomMenuItem::new(
                                "default_workspace".to_string(),
                                "Default Workspace"
                            )
                        )
                        .add_native_item(MenuItem::Separator)
                        .add_item(CustomMenuItem::new("empty".to_string(), "Empty").disabled());
                    let mut file_menu = Menu::new()
                        .add_item(
                            CustomMenuItem::new("new_conversation".to_string(), "New conversation")
                        )
                        .add_native_item(MenuItem::Separator)
                        .add_item(CustomMenuItem::new("open".to_string(), "Open"))
                        .add_submenu(Submenu::new("Open Recent", recents_menu))
                        .add_native_item(MenuItem::Separator)
                        .add_item(CustomMenuItem::new("save_as".to_string(), "Save As..."))
                        .add_native_item(MenuItem::Separator)
                        .add_item(CustomMenuItem::new("import".to_string(), "import"))
                        .add_item(CustomMenuItem::new("export".to_string(), "Export"))
                        .add_native_item(MenuItem::Separator);

                    file_menu = file_menu.add_native_item(MenuItem::CloseWindow);
                    #[cfg(not(target_os = "macos"))]
                    {
                        file_menu = file_menu.add_native_item(MenuItem::Quit);
                    }
                    menu = menu.add_submenu(Submenu::new("File", file_menu));

                    continue;
                } else if submenu.title == "Window".to_owned() {
                    let models_menu = Menu::new()
                        .add_item(
                            CustomMenuItem::new(
                                "install_local_model".to_string(),
                                "Install local model"
                            )
                        )
                        .add_item(
                            CustomMenuItem::new("add_cloud_model".to_string(), "Add cloud model")
                        );
                    menu = menu.add_submenu(Submenu::new("Models", models_menu));

                    let models_menu = Menu::new()
                        .add_item(
                            CustomMenuItem::new(
                                "configure_chatgpt".to_string(),
                                "Configure ChatGPT"
                            )
                        )
                        .add_item(
                            CustomMenuItem::new("add_ai_providers".to_string(), "Add AI providers")
                        );
                    menu = menu.add_submenu(Submenu::new("Providers", models_menu));
                }
                menu = menu.add_submenu(submenu.clone());
            }
        }
        // let quit = CustomMenuItem::new("quit".to_string(), "Quit");
        // let close = CustomMenuItem::new("close".to_string(), "Close");
        // let submenu = Submenu::new("File", Menu::new().add_item(quit).add_item(close));
        // let menu = Menu::new()
        //    .add_native_item(MenuItem::Copy);

        menu.to_owned()
    }
}
