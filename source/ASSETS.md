# Asset provenance & licenses

All third-party assets in this project are **CC0 1.0 (public domain)**. Every downloaded file was
verified against the publisher's MD5 (Poly Haven API) before use, converted to GLB/WebP by
`tools/build-assets.mjs`, and checked by `tools/validate-models.mjs` (index ranges, finite positions,
normals/UVs, plausible real-world bounds) and visually in `docs/asset-contact-sheet.jpg`.

## Characters & animation (Quaternius, CC0)

| Asset | Source | License |
|---|---|---|
| Universal Base Characters (Standard) — male/female bodies, hair, eyebrows | https://quaternius.itch.io/universal-base-characters | CC0 1.0 |
| Universal Animation Library (Standard) — idle/walk/jog clips | https://quaternius.itch.io/universal-animation-library | CC0 1.0 |
| Universal Animation Library 2 (Standard) | https://quaternius.itch.io/universal-animation-library-2 | CC0 1.0 |

The base bodies ship with two broken texture URIs (`*_png.png`), patched during import. Clothing is not a
separate mesh: the outfit shader + bind-pose smoothing in `src/actors/character.js` / `clothsim.js` paints it.

## Poly Haven (CC0) — models, textures, HDRI

Source: https://polyhaven.com — license: CC0 1.0.

| Type | ID | Name | Authors | Resolution | Page |
|---|---|---|---|---|---|
| model | `ArmChair_01` | Arm Chair 01 | Kirill Sannikov | 2k | https://polyhaven.com/a/ArmChair_01 |
| model | `bananas` | Bananas | Alexander Shulha | 1k | https://polyhaven.com/a/bananas |
| texture | `black_walnut_veneer_01` | Black Walnut Veneer 01 | Jenelle van Heerden | 2k | https://polyhaven.com/a/black_walnut_veneer_01 |
| model | `book_encyclopedia_set_01` | Book Encyclopedia Set 01 | John Malcolm | 1k | https://polyhaven.com/a/book_encyclopedia_set_01 |
| model | `brass_candleholders` | Brass Candleholders | Tina | 1k | https://polyhaven.com/a/brass_candleholders |
| texture | `brown_mud_leaves_01` | Brown Mud Leaves 01 | Rob Tuytel | 2k | https://polyhaven.com/a/brown_mud_leaves_01 |
| model | `carved_wooden_elephant` | Carved Wooden Elephant | Greg Zaal | 1k | https://polyhaven.com/a/carved_wooden_elephant |
| texture | `castle_brick_01` | Castle Brick 01 | Rob Tuytel | 2k | https://polyhaven.com/a/castle_brick_01 |
| model | `ceramic_pot` | Ceramic Pot | Aron Łyczek | 1k | https://polyhaven.com/a/ceramic_pot |
| model | `Chandelier_01` | Chandelier 01 | Kirill Sannikov | 1k | https://polyhaven.com/a/Chandelier_01 |
| model | `Chandelier_02` | Chandelier 02 | Kirill Sannikov | 1k | https://polyhaven.com/a/Chandelier_02 |
| model | `Chandelier_03` | Chandelier 03 | Kirill Sannikov | 1k | https://polyhaven.com/a/Chandelier_03 |
| model | `ClassicConsole_01` | Classic Console 01 | Kirill Sannikov | 2k | https://polyhaven.com/a/ClassicConsole_01 |
| model | `ClassicNightstand_01` | Classic Nightstand 01 | Kirill Sannikov | 1k | https://polyhaven.com/a/ClassicNightstand_01 |
| texture | `dark_paneled_wood` | Dark Paneled Wood | Dimitrios Savva | 2k | https://polyhaven.com/a/dark_paneled_wood |
| texture | `dark_wood` | Dark Wood | Dario Barresi, Dimitrios Savva, Rico Cilliers | 2k | https://polyhaven.com/a/dark_wood |
| texture | `decrepit_wallpaper` | Decrepit Wallpaper | Rob Tuytel | 2k | https://polyhaven.com/a/decrepit_wallpaper |
| texture | `diagonal_parquet` | Diagonal Parquet | Jenelle van Heerden, Sergej Majboroda | 2k | https://polyhaven.com/a/diagonal_parquet |
| model | `dining_chair_02` | Dining Chair 02 | James Ray Cock | 1k | https://polyhaven.com/a/dining_chair_02 |
| model | `dining_table` | Dining Table | Aron Łyczek | 1k | https://polyhaven.com/a/dining_table |
| texture | `fabric_pattern_05` | Fabric Pattern 05 | Rob Tuytel | 1k | https://polyhaven.com/a/fabric_pattern_05 |
| model | `fancy_picture_frame_01` | Fancy Picture Frame 01 | Rob Tuytel, Rico Cilliers | 1k | https://polyhaven.com/a/fancy_picture_frame_01 |
| model | `fancy_picture_frame_02` | Fancy Picture Frame 02 | Rob Tuytel, Rico Cilliers | 1k | https://polyhaven.com/a/fancy_picture_frame_02 |
| model | `gothic_coffee_table` | Gothic Coffee Table | Ulan Cabanilla | 1k | https://polyhaven.com/a/gothic_coffee_table |
| model | `GothicCabinet_01` | Gothic Cabinet 01 | Kirill Sannikov | 1k | https://polyhaven.com/a/GothicCabinet_01 |
| texture | `green_metal_rust` | Green Metal Rust | Rob Tuytel | 2k | https://polyhaven.com/a/green_metal_rust |
| model | `GreenChair_01` | Green Chair 01 | Kirill Sannikov | 1k | https://polyhaven.com/a/GreenChair_01 |
| texture | `herringbone_parquet` | Herringbone Parquet | Jenelle van Heerden, Sergej Majboroda | 2k | https://polyhaven.com/a/herringbone_parquet |
| model | `jug_01` | Jug 01 | Kuutti Siitonen | 1k | https://polyhaven.com/a/jug_01 |
| texture | `kitchen_wood` | Kitchen Wood | Rob Tuytel | 2k | https://polyhaven.com/a/kitchen_wood |
| texture | `lacquered_cherry_wood` | Lacquered Cherry Wood | Jenelle van Heerden, Rico Cilliers | 2k | https://polyhaven.com/a/lacquered_cherry_wood |
| model | `Lantern_01` | Lantern 01 | Rajil Jose Macatangay | 1k | https://polyhaven.com/a/Lantern_01 |
| model | `lantern_chandelier_01` | Lantern Chandelier 01 | Kirill Sannikov | 1k | https://polyhaven.com/a/lantern_chandelier_01 |
| texture | `leather_red_02` | Leather Red 02 | Rob Tuytel | 1k | https://polyhaven.com/a/leather_red_02 |
| model | `lemon` | Lemon | Kuutti Siitonen | 1k | https://polyhaven.com/a/lemon |
| model | `lightbulb_01` | Lightbulb 01 | Josh Dean | 1k | https://polyhaven.com/a/lightbulb_01 |
| model | `lion_head` | Lion Head | Tina | 1k | https://polyhaven.com/a/lion_head |
| texture | `long_white_tiles` | Long White Tiles | Jenelle van Heerden, Sergej Majboroda | 2k | https://polyhaven.com/a/long_white_tiles |
| model | `magnifying_glass_01` | Magnifying Glass 01 | Nazar Borodavka | 1k | https://polyhaven.com/a/magnifying_glass_01 |
| model | `mantel_clock_01` | Mantel Clock 01 | Yann Kervran, Rico Cilliers | 1k | https://polyhaven.com/a/mantel_clock_01 |
| texture | `marble_01` | Marble 01 | Rob Tuytel | 2k | https://polyhaven.com/a/marble_01 |
| model | `marble_bust_01` | Marble Bust 01 | Rico Cilliers | 1k | https://polyhaven.com/a/marble_bust_01 |
| model | `metal_jug` | Metal Jug | Anzor Lezhava | 1k | https://polyhaven.com/a/metal_jug |
| model | `metal_stool_01` | Metal Stool 01 | Ulan Cabanilla | 1k | https://polyhaven.com/a/metal_stool_01 |
| model | `nettle_plant` | Nettle Plant | Rob Tuytel, Rico Cilliers | 1k | https://polyhaven.com/a/nettle_plant |
| texture | `oak_veneer_01` | Oak Veneer 01 | Jenelle van Heerden | 2k | https://polyhaven.com/a/oak_veneer_01 |
| hdri | `old_hall` | Old Hall | Sergej Majboroda | 1k | https://polyhaven.com/a/old_hall |
| texture | `old_wood_floor` | Old Wood Floor | Guillaume Monsergent | 2k | https://polyhaven.com/a/old_wood_floor |
| model | `ornate_mirror_01` | Ornate Mirror 01 | James Ray Cock | 1k | https://polyhaven.com/a/ornate_mirror_01 |
| model | `pachira_aquatica_01` | Pachira Aquatica 01 | Rob Tuytel, Rico Cilliers | 1k | https://polyhaven.com/a/pachira_aquatica_01 |
| texture | `painted_plaster_wall` | Painted Plaster Wall | Amal Kumar | 2k | https://polyhaven.com/a/painted_plaster_wall |
| model | `painted_wooden_bench` | Painted Wooden Bench | Kirill Sannikov | 1k | https://polyhaven.com/a/painted_wooden_bench |
| model | `painted_wooden_cabinet` | Painted Wooden Cabinet | Kirill Sannikov | 1k | https://polyhaven.com/a/painted_wooden_cabinet |
| model | `painted_wooden_cabinet_02` | Painted Wooden Cabinet 02 | Kirill Sannikov | 1k | https://polyhaven.com/a/painted_wooden_cabinet_02 |
| model | `painted_wooden_chair_01` | Painted Wooden Chair 01 | Kuutti Siitonen | 1k | https://polyhaven.com/a/painted_wooden_chair_01 |
| model | `painted_wooden_shelves` | Painted Wooden Shelves | Kirill Sannikov | 1k | https://polyhaven.com/a/painted_wooden_shelves |
| model | `painted_wooden_stool` | Painted Wooden Stool | Kirill Sannikov | 1k | https://polyhaven.com/a/painted_wooden_stool |
| texture | `patio_tiles` | Patio Tiles | Dario Barresi | 2k | https://polyhaven.com/a/patio_tiles |
| model | `periwinkle_plant` | Periwinkle Plant | Amal Kumar | 1k | https://polyhaven.com/a/periwinkle_plant |
| model | `planter_box_01` | Planter Box 01 | James Ray Cock | 1k | https://polyhaven.com/a/planter_box_01 |
| model | `planter_pot_clay` | Planter Pot Clay | Amal Kumar | 1k | https://polyhaven.com/a/planter_pot_clay |
| model | `pocket_watch` | Pocket Watch | PierreB3D | 1k | https://polyhaven.com/a/pocket_watch |
| texture | `poly_wool_herringbone` | Poly Wool Herringbone | colormass, Rico Cilliers | 1k | https://polyhaven.com/a/poly_wool_herringbone |
| model | `pot_enamel_01` | Pot Enamel 01 | Kuutti Siitonen | 1k | https://polyhaven.com/a/pot_enamel_01 |
| model | `potted_plant_01` | Potted Plant 01 | Rico Cilliers | 1k | https://polyhaven.com/a/potted_plant_01 |
| model | `potted_plant_02` | Potted Plant 02 | Rico Cilliers | 1k | https://polyhaven.com/a/potted_plant_02 |
| model | `potted_plant_04` | Potted Plant 04 | James Ray Cock | 1k | https://polyhaven.com/a/potted_plant_04 |
| model | `pull_chain_light_socket` | Pull Chain Light Socket | Josh Dean | 1k | https://polyhaven.com/a/pull_chain_light_socket |
| texture | `quatrefoil_jacquard_fabric` | Quatrefoil Jacquard Fabric | colormass, Rico Cilliers | 1k | https://polyhaven.com/a/quatrefoil_jacquard_fabric |
| texture | `rectangular_parquet` | Rectangular Parquet | Jenelle van Heerden, Sergej Majboroda | 2k | https://polyhaven.com/a/rectangular_parquet |
| texture | `red_brick` | Red Brick | Rob Tuytel | 2k | https://polyhaven.com/a/red_brick |
| model | `Rockingchair_01` | Rockingchair 01 | Jorge Camacho | 1k | https://polyhaven.com/a/Rockingchair_01 |
| texture | `rough_linen` | Rough Linen | colormass, Rico Cilliers | 1k | https://polyhaven.com/a/rough_linen |
| model | `round_spectacles` | Round Spectacles | Sean Buckley | 1k | https://polyhaven.com/a/round_spectacles |
| model | `rubber_boots` | Rubber Boots | L | 1k | https://polyhaven.com/a/rubber_boots |
| model | `rusted_spade_01` | Rusted Spade 01 | Blemonade | 1k | https://polyhaven.com/a/rusted_spade_01 |
| model | `scandinavian_masonry_heater` | Scandinavian Masonry Heater | Kuutti Siitonen | 1k | https://polyhaven.com/a/scandinavian_masonry_heater |
| model | `seeding_tray_01` | Seedling Tray 01 | Satyaki Mandal | 1k | https://polyhaven.com/a/seeding_tray_01 |
| model | `shrub_02` | Shrub 02 | Rico Cilliers | 1k | https://polyhaven.com/a/shrub_02 |
| model | `side_table_tall_01` | Side Table Tall 01 | James Ray Cock | 1k | https://polyhaven.com/a/side_table_tall_01 |
| model | `sofa_03` | Sofa 03 | Fran Calvente | 2k | https://polyhaven.com/a/sofa_03 |
| model | `standing_picture_frame_01` | Standing Picture Frame 01 | James Ray Cock | 1k | https://polyhaven.com/a/standing_picture_frame_01 |
| texture | `stone_tiles` | Stone Tiles | Christopher Melani | 2k | https://polyhaven.com/a/stone_tiles |
| model | `strawberry_chocolate_cake` | Strawberry Chocolate Cake | Kuutti Siitonen | 1k | https://polyhaven.com/a/strawberry_chocolate_cake |
| model | `sweet_potato` | Sweet Potato | Jan Martens | 1k | https://polyhaven.com/a/sweet_potato |
| model | `tea_set_01` | Tea Set 01 | James Ray Cock, Rico Cilliers, Jurita Burger | 1k | https://polyhaven.com/a/tea_set_01 |
| texture | `terracotta_floor_tiles` | Terracotta Floor Tiles | Dimitrios Savva | 2k | https://polyhaven.com/a/terracotta_floor_tiles |
| model | `trowel_01` | Trowel 01 | Satyaki Mandal | 1k | https://polyhaven.com/a/trowel_01 |
| texture | `velour_velvet` | Velour Velvet | colormass, Rico Cilliers | 1k | https://polyhaven.com/a/velour_velvet |
| model | `vintage_cabinet_01` | Vintage Cabinet 01 | Rico Cilliers | 2k | https://polyhaven.com/a/vintage_cabinet_01 |
| model | `vintage_electric_kettle` | Vintage Electric Kettle | SV Garip | 1k | https://polyhaven.com/a/vintage_electric_kettle |
| model | `vintage_microscope` | Vintage Microscope | Luis José Fernández Rodríguez | 1k | https://polyhaven.com/a/vintage_microscope |
| model | `vintage_oil_lamp` | Vintage Oil Lamp | Monsta3D | 1k | https://polyhaven.com/a/vintage_oil_lamp |
| model | `vintage_radio_transceiver` | Vintage Radio Transceiver | Mateusz Sadek | 1k | https://polyhaven.com/a/vintage_radio_transceiver |
| model | `vintage_suitcase` | Vintage Suitcase | Maximilian Schuster | 1k | https://polyhaven.com/a/vintage_suitcase |
| model | `vintage_telephone_wall_clock` | Vintage Telephone Wall Clock | Adrian C | 1k | https://polyhaven.com/a/vintage_telephone_wall_clock |
| model | `vintage_wooden_drawer_01` | Vintage Wooden Drawer 01 | James Ray Cock | 1k | https://polyhaven.com/a/vintage_wooden_drawer_01 |
| model | `watering_can_metal_01` | Watering Can Metal 01 | Charles Nderitu | 1k | https://polyhaven.com/a/watering_can_metal_01 |
| texture | `white_plaster_rough_01` | White Plaster Rough 01 | Rob Tuytel | 2k | https://polyhaven.com/a/white_plaster_rough_01 |
| model | `wicker_basket_01` | Wicker Basket 01 | Kuutti Siitonen | 1k | https://polyhaven.com/a/wicker_basket_01 |
| model | `wine_bottles_01` | Wine Bottles 01 | Rico Cilliers, Jurita Burger | 1k | https://polyhaven.com/a/wine_bottles_01 |
| texture | `wood_cabinet_worn_long` | Wood Cabinet Worn Long | Dimitrios Savva, Rico Cilliers | 2k | https://polyhaven.com/a/wood_cabinet_worn_long |
| texture | `wood_table_worn` | Wood Table Worn | Dimitrios Savva, Rico Cilliers | 2k | https://polyhaven.com/a/wood_table_worn |
| model | `wooden_bookshelf_worn` | Wooden Bookshelf Worn | Ulan Cabanilla | 1k | https://polyhaven.com/a/wooden_bookshelf_worn |
| model | `wooden_bowl_01` | Wooden Bowl 01 | Oliver Harries | 1k | https://polyhaven.com/a/wooden_bowl_01 |
| model | `wooden_broom` | Wooden Broom | Balen | 1k | https://polyhaven.com/a/wooden_broom |
| model | `wooden_bucket_01` | Wooden Bucket 01 | James Ray Cock | 1k | https://polyhaven.com/a/wooden_bucket_01 |
| model | `wooden_candlestick` | Wooden Candlestick | Josh Dean | 1k | https://polyhaven.com/a/wooden_candlestick |
| model | `wooden_crate_02` | Wooden Crate 02 | James Ray Cock, Jurita Burger | 1k | https://polyhaven.com/a/wooden_crate_02 |
| model | `wooden_cutting_board` | Wooden Cutting Board | Kuutti Siitonen | 1k | https://polyhaven.com/a/wooden_cutting_board |
| model | `wooden_lantern_01` | Wooden Lantern 01 | James Ray Cock | 1k | https://polyhaven.com/a/wooden_lantern_01 |
| model | `wooden_stool_01` | Wooden Stool 01 | Kuutti Siitonen | 1k | https://polyhaven.com/a/wooden_stool_01 |
| model | `WoodenChair_01` | Wooden Chair 01 | Jake Mobley | 1k | https://polyhaven.com/a/WoodenChair_01 |
| texture | `worn_plaster_wall` | Worn Plaster Wall | Dimitrios Savva | 2k | https://polyhaven.com/a/worn_plaster_wall |
| model | `yellow_onion` | Yellow Onion | Kuutti Siitonen | 1k | https://polyhaven.com/a/yellow_onion |

## Rejected assets

| Asset | Reason |
|---|---|
| `vintage_grandfather_clock_01` (Poly Haven) | Published `.bin` fails its own MD5 and is 128 bytes short of the glTF `byteLength`; GPU read out-of-range data and rendered long spikes in the foyer. Removed; a Gothic hall chair took its place. |
| `decorative_book_set_01` (Poly Haven) | Texture-only set (no glTF). Books are built procedurally (`bookRow` in `src/world/fixtures.js`) with a generated spine atlas. |

## Procedural / generated in code (original to this project)

- Architectural trim (baseboard, chair rail, crown, picture rail, casings) extruded from profile curves — `src/world/arch.js`.
- Raised-panel wainscoting, coffered/beamed ceilings, door joinery, sash windows, velvet curtains, marble chimneypieces with ember/flame shaders, Persian rug weaves, book spines, bell board, pedestal desk, dining table with turned legs, library bookcases, kitchen range, stone sink, conservatory ironwork — `src/world/fixtures.js`, `src/world/furniture.js`, `src/rooms/*.js`.
- Wallpaper (Victorian stripe & sprig), house plan drawing, letters/papers, footprints, soot, storm backdrop — canvas textures generated at runtime.
