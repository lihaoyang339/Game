extends Node
## Session state: inventory, health, weapons, keys, subtitles. UI and actors talk through these signals.

signal message(text: String, seconds: float)
signal inventory_changed
signal health_changed(hp: float)
signal weapon_changed(id: String)
signal ammo_changed(mag: int, reserve: int)

const ITEMS := {
	"pistol": {"name": "手枪（9mm）", "desc": "装弹 10 发。按住右键瞄准，左键射击，R 换弹。", "kind": "weapon", "icon": "◎"},
	"knife": {"name": "战术小刀", "desc": "近战武器。没有子弹时也能自保。", "kind": "weapon", "icon": "†"},
	"ammo": {"name": "9mm 子弹", "desc": "手枪弹药。", "kind": "ammo", "icon": "▪"},
	"med": {"name": "急救喷雾", "desc": "按 Q 快速治疗，恢复大部分体力。", "kind": "heal", "icon": "+"},
	"herb": {"name": "草药", "desc": "按 Q 快速治疗，恢复少量体力。", "kind": "heal", "icon": "♣"},
	"house_service_key": {"name": "仆役门钥匙", "desc": "黄铜钥匙，挂着写有“SERVICE”的木牌。", "kind": "key", "icon": "⚷"},
	"lighter": {"name": "打火机", "desc": "车里找到的。只剩一点燃气。", "kind": "misc", "icon": "♨"},
}

var inventory: Array = []         # [{id, n}]
var hp := 100.0
var max_hp := 100.0
var weapon := "none"              # none | pistol | knife
var mag := 10
var mag_size := 10
var flags := {}

func reset_session() -> void:
	inventory = [{"id": "pistol", "n": 1}, {"id": "knife", "n": 1}, {"id": "ammo", "n": 24}, {"id": "med", "n": 1}, {"id": "herb", "n": 2}, {"id": "lighter", "n": 1}]
	hp = max_hp; mag = mag_size; weapon = "pistol"; flags = {}
	inventory_changed.emit(); health_changed.emit(hp); weapon_changed.emit(weapon); ammo_changed.emit(mag, count("ammo"))

func say(text: String, seconds := 0.0) -> void:
	message.emit(text, seconds if seconds > 0.0 else 2.0 + text.length() * 0.07)

func count(id: String) -> int:
	for it in inventory:
		if it.id == id:
			return it.n
	return 0

func has(id: String) -> bool:
	return count(id) > 0

func add_item(id: String, n := 1) -> void:
	for it in inventory:
		if it.id == id:
			it.n += n
			inventory_changed.emit(); ammo_changed.emit(mag, count("ammo"))
			return
	inventory.append({"id": id, "n": n})
	inventory_changed.emit(); ammo_changed.emit(mag, count("ammo"))

func take(id: String, n := 1) -> bool:
	for i in inventory.size():
		var it = inventory[i]
		if it.id == id and it.n >= n:
			it.n -= n
			if it.n <= 0 and ITEMS.get(id, {}).get("kind", "") != "weapon":
				inventory.remove_at(i)
			inventory_changed.emit(); ammo_changed.emit(mag, count("ammo"))
			return true
	return false

func weapons() -> Array:
	var w := ["none"]
	for id in ["pistol", "knife"]:
		if has(id):
			w.append(id)
	return w

func cycle_weapon(dir: int) -> void:
	var w := weapons()
	var i := w.find(weapon)
	weapon = w[(i + dir + w.size()) % w.size()]
	weapon_changed.emit(weapon)

func set_weapon(id: String) -> void:
	if id == "none" or has(id):
		weapon = id
		weapon_changed.emit(weapon)

func damage(amount: float) -> void:
	hp = maxf(0.0, hp - amount)
	health_changed.emit(hp)

func heal_best() -> String:
	for id in ["herb", "med"]:
		if hp < max_hp - 1.0 and take(id):
			hp = minf(max_hp, hp + (35.0 if id == "herb" else 80.0))
			health_changed.emit(hp)
			return id
	return ""

## 0 = healthy, 1 = critical. Drives injured locomotion and the HUD.
func injury() -> float:
	return clampf(1.0 - hp / max_hp, 0.0, 1.0)
