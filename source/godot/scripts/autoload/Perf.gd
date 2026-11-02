extends Node
## Frame metrics, F3 overlay and benchmark recorder (§22): avg FPS, 1% low, CPU/GPU frame time, memory,
## VRAM, draw calls, shader/pipeline compilation spikes, load times and drift over a long run.
## Reports are written to user://bench/ (macOS: ~/Library/Application Support/Godot/app_userdata/The Manor/bench).

var overlay_visible := false
var notes := {}                 # free-form numbers (e.g. load_ms) recorded into the next report
var _layer: CanvasLayer
var _label: Label
var _acc := 0.0
var _frames := 0
var _rec := false
var _rec_label := ""
var _rec_t0 := 0
var _samples: PackedFloat32Array = []   # frame time ms
var _cpu: PackedFloat32Array = []        # main-thread process+physics ms
var _gpu: PackedFloat32Array = []        # GPU render ms (viewport measured)
var _rcpu: PackedFloat32Array = []       # render-thread CPU ms
var _per_sec: Array = []                 # [t, fps, avg_ms, p99_ms, cpu, gpu, mem_mb, vram_mb, draws, compiles]
var _sec_frames: PackedFloat32Array = []
var _sec_t := 0.0
var _compiles_prev := 0
var _compile_frames := 0
var _hitches := 0
var _hitch_compile := 0
var _mem_start := 0.0
var _mem_max := 0.0
var _vram_max := 0.0
var _last_report := ""

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	process_priority = 1000
	_layer = CanvasLayer.new()
	_layer.layer = 120
	add_child(_layer)
	_label = Label.new()
	_label.position = Vector2(10, 8)
	_label.add_theme_font_size_override("font_size", 14)
	_label.add_theme_color_override("font_outline_color", Color.BLACK)
	_label.add_theme_constant_override("outline_size", 4)
	_layer.add_child(_label)
	_layer.visible = false
	RenderingServer.viewport_set_measure_render_time(get_viewport().get_viewport_rid(), true)
	_compiles_prev = _compiles()
	overlay_visible = Settings.get_v("show_perf")
	_layer.visible = overlay_visible

func _unhandled_input(e: InputEvent) -> void:
	if e.is_action_pressed("perf_overlay"):
		overlay_visible = not overlay_visible
		_layer.visible = overlay_visible
		Settings.set_v("show_perf", overlay_visible)

func _compiles() -> int:
	return int(Performance.get_monitor(Performance.PIPELINE_COMPILATIONS_CANVAS) + Performance.get_monitor(Performance.PIPELINE_COMPILATIONS_MESH) \
		+ Performance.get_monitor(Performance.PIPELINE_COMPILATIONS_SURFACE) + Performance.get_monitor(Performance.PIPELINE_COMPILATIONS_DRAW) \
		+ Performance.get_monitor(Performance.PIPELINE_COMPILATIONS_SPECIALIZATION))

func gpu_ms() -> float:
	return RenderingServer.viewport_get_measured_render_time_gpu(get_viewport().get_viewport_rid())

func render_cpu_ms() -> float:
	return RenderingServer.viewport_get_measured_render_time_cpu(get_viewport().get_viewport_rid()) + RenderingServer.get_frame_setup_time_cpu()

func _process(delta: float) -> void:
	var ms := delta * 1000.0
	var cpu := (Performance.get_monitor(Performance.TIME_PROCESS) + Performance.get_monitor(Performance.TIME_PHYSICS_PROCESS)) * 1000.0
	var gpu := gpu_ms()
	var c := _compiles()
	var new_compiles := c - _compiles_prev
	_compiles_prev = c
	if _rec:
		_samples.append(ms); _cpu.append(cpu); _gpu.append(gpu); _rcpu.append(render_cpu_ms())
		_sec_frames.append(ms)
		var target := 1000.0 / maxf(1.0, float(Engine.max_fps if Engine.max_fps > 0 else 60))
		if ms > maxf(target * 2.0, 33.4):
			_hitches += 1
			if new_compiles > 0:
				_hitch_compile += 1
		if new_compiles > 0:
			_compile_frames += 1
		var mem := OS.get_static_memory_usage() / 1048576.0
		var vram := Performance.get_monitor(Performance.RENDER_VIDEO_MEM_USED) / 1048576.0
		_mem_max = maxf(_mem_max, mem); _vram_max = maxf(_vram_max, vram)
		_sec_t += delta
		if _sec_t >= 1.0:
			var arr := _sec_frames.duplicate(); arr.sort()
			var avg := _mean(_sec_frames)
			_per_sec.append([snappedf((Time.get_ticks_msec() - _rec_t0) / 1000.0, 0.1), snappedf(_sec_frames.size() / _sec_t, 0.1), snappedf(avg, 0.01), snappedf(arr[int(arr.size() * 0.99) - 1 if arr.size() > 1 else 0], 0.01),
				snappedf(cpu, 0.01), snappedf(gpu, 0.01), snappedf(mem, 0.1), snappedf(vram, 0.1), int(Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME)), c])
			_sec_frames.clear(); _sec_t = 0.0
	_acc += delta; _frames += 1
	if overlay_visible and _acc >= 0.25:
		_label.text = "%d FPS  %.1f ms  (上限 %s)\nCPU %.2f ms   GPU %.2f ms   渲染线程 %.2f ms\n内存 %.0f MB   显存 %.0f MB\n绘制 %d   图元 %.0fk   着色器编译 %d\n%s  %s" % [
			roundi(_frames / _acc), _acc * 1000.0 / _frames, str(Engine.max_fps) if Engine.max_fps > 0 else "无",
			cpu, gpu, render_cpu_ms(),
			OS.get_static_memory_usage() / 1048576.0, Performance.get_monitor(Performance.RENDER_VIDEO_MEM_USED) / 1048576.0,
			Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME), Performance.get_monitor(Performance.RENDER_TOTAL_PRIMITIVES_IN_FRAME) / 1000.0, c,
			RenderingServer.get_current_rendering_method(), RenderingServer.get_video_adapter_name()]
		_acc = 0.0; _frames = 0
	elif _acc >= 0.25:
		_acc = 0.0; _frames = 0

# ---------------------------------------------------------------- recording
func start_recording(label: String) -> void:
	_rec = true; _rec_label = label; _rec_t0 = Time.get_ticks_msec()
	_samples.clear(); _cpu.clear(); _gpu.clear(); _rcpu.clear(); _per_sec.clear(); _sec_frames.clear(); _sec_t = 0.0
	_hitches = 0; _hitch_compile = 0; _compile_frames = 0
	_mem_start = OS.get_static_memory_usage() / 1048576.0; _mem_max = _mem_start; _vram_max = 0.0

func is_recording() -> bool:
	return _rec

func recorded_seconds() -> float:
	return (Time.get_ticks_msec() - _rec_t0) / 1000.0 if _rec else 0.0

static func _mean(a: PackedFloat32Array) -> float:
	if a.is_empty():
		return 0.0
	var s := 0.0
	for v in a:
		s += v
	return s / a.size()

static func _pct(a: PackedFloat32Array, p: float) -> float:
	if a.is_empty():
		return 0.0
	var b := a.duplicate(); b.sort()
	return b[clampi(int(ceil(b.size() * p)) - 1, 0, b.size() - 1)]

## Mean of the worst 1% frame times (the usual "1% low" definition), as FPS.
static func _one_pct_low_fps(a: PackedFloat32Array) -> float:
	if a.is_empty():
		return 0.0
	var b := a.duplicate(); b.sort()
	var n := maxi(1, int(b.size() * 0.01))
	var s := 0.0
	for i in n:
		s += b[b.size() - 1 - i]
	return 1000.0 / (s / n)

func stop_recording() -> Dictionary:
	_rec = false
	var secs := (Time.get_ticks_msec() - _rec_t0) / 1000.0
	var r := {
		"label": _rec_label, "seconds": snappedf(secs, 0.1), "frames": _samples.size(),
		"avg_fps": snappedf(_samples.size() / maxf(secs, 0.001), 0.1),
		"one_pct_low_fps": snappedf(_one_pct_low_fps(_samples), 0.1),
		"frame_ms_avg": snappedf(_mean(_samples), 0.01), "frame_ms_p99": snappedf(_pct(_samples, 0.99), 0.01), "frame_ms_max": snappedf(_pct(_samples, 1.0), 0.01),
		"cpu_ms_avg": snappedf(_mean(_cpu), 0.01), "cpu_ms_p99": snappedf(_pct(_cpu, 0.99), 0.01),
		"gpu_ms_avg": snappedf(_mean(_gpu), 0.01), "gpu_ms_p99": snappedf(_pct(_gpu, 0.99), 0.01),
		"render_thread_cpu_ms_avg": snappedf(_mean(_rcpu), 0.01),
		"mem_start_mb": snappedf(_mem_start, 0.1), "mem_end_mb": snappedf(OS.get_static_memory_usage() / 1048576.0, 0.1), "mem_max_mb": snappedf(_mem_max, 0.1),
		"vram_max_mb": snappedf(_vram_max, 0.1),
		"hitches": _hitches, "hitches_with_shader_compile": _hitch_compile, "frames_with_pipeline_compiles": _compile_frames,
		"renderer": RenderingServer.get_current_rendering_method(), "rendering_driver": RenderingServer.get_current_rendering_driver_name(),
		"gpu": RenderingServer.get_video_adapter_name(), "gpu_vendor": RenderingServer.get_video_adapter_vendor(), "os": OS.get_name() + " " + OS.get_version(),
		"cpu_name": OS.get_processor_name(), "cpu_threads": OS.get_processor_count(), "engine": Engine.get_version_info().string,
		"resolution": "%dx%d" % [get_viewport().size.x, get_viewport().size.y], "render_scale": get_viewport().scaling_3d_scale,
		"upscaler": Settings.get_v("upscaler"), "quality": Settings.QUALITY_NAMES[Settings.get_v("quality")], "fps_cap": Engine.max_fps,
		"vsync": Settings.get_v("vsync"), "notes": notes.duplicate(),
	}
	# drift: compare first and last minute (or thirds for short runs)
	if _per_sec.size() >= 6:
		var n := mini(60, _per_sec.size() / 3)
		var first := _per_sec.slice(0, n); var last := _per_sec.slice(_per_sec.size() - n)
		var f := func(rows, i): return rows.reduce(func(acc, x): return acc + float(x[i]), 0.0) / rows.size()
		r["drift"] = {
			"window_s": n, "fps_first": snappedf(f.call(first, 1), 0.1), "fps_last": snappedf(f.call(last, 1), 0.1),
			"frame_ms_first": snappedf(f.call(first, 2), 0.01), "frame_ms_last": snappedf(f.call(last, 2), 0.01),
			"mem_first_mb": snappedf(f.call(first, 6), 0.1), "mem_last_mb": snappedf(f.call(last, 6), 0.1),
			"mem_slope_mb_per_min": snappedf((f.call(last, 6) - f.call(first, 6)) / maxf(0.1, (float(last[0][0]) - float(first[0][0])) / 60.0), 0.01),
		}
	_write_report(r)
	return r

func _write_report(r: Dictionary) -> void:
	DirAccess.make_dir_recursive_absolute("user://bench")
	var stamp := Time.get_datetime_string_from_system().replace(":", "-")
	var base := "user://bench/%s-%s" % [stamp, r.label]
	var csv := FileAccess.open(base + ".csv", FileAccess.WRITE)
	if csv:
		csv.store_line("t_s,fps,frame_ms_avg,frame_ms_p99,cpu_ms,gpu_ms,mem_mb,vram_mb,draw_calls,pipeline_compiles_total")
		for row in _per_sec:
			csv.store_line(",".join(row.map(func(x): return str(x))))
		csv.close()
	var js := FileAccess.open(base + ".json", FileAccess.WRITE)
	if js:
		js.store_string(JSON.stringify(r, "  "))
		js.close()
	var md := FileAccess.open(base + ".md", FileAccess.WRITE)
	if md:
		md.store_line("# Benchmark: %s\n" % r.label)
		for k in r:
			md.store_line("- **%s**: %s" % [k, JSON.stringify(r[k]) if r[k] is Dictionary else str(r[k])])
		md.close()
	_last_report = ProjectSettings.globalize_path(base + ".md")
	print("[bench] report: ", _last_report)
	print("[bench] ", JSON.stringify(r))

func last_report_path() -> String:
	return _last_report
