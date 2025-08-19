export default interface Game {
    name: string;
    display_name: string;
    banner?: string;
    last_played: number;
    favourite: boolean;
    custom_banner: boolean;
    shortcut_slot: number;
    hidden: number;

    launcher_name: string;
    launcher_location: string;

    game_id: string;
    game_size: number;
    game_dir: string;

    launch_command: string;
    launch_args: string;
    exe_file: string;
}