extends Node
## World sound events that AI can hear (§21.8: The Listener perceives primarily by sound).
## radius = distance (m) at which the sound is still audible in open air; walls/doors attenuate it.

signal noise(pos: Vector3, radius: float, kind: String, source: Node)

var recent: Array = []   # [{pos, radius, kind, t}]

func emit_noise(pos: Vector3, radius: float, kind: String, source: Node = null) -> void:
	var t := Time.get_ticks_msec() / 1000.0
	recent.append({"pos": pos, "radius": radius, "kind": kind, "t": t})
	while recent.size() > 64 or (recent.size() > 0 and t - recent[0].t > 6.0):
		recent.pop_front()
	noise.emit(pos, radius, kind, source)
