// Impede a abertura de uma janela de console extra no Windows em builds release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    teglato_lib::run();
}
