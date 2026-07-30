"use client"

import * as React from "react"

import {
  CANVAS_MAX_ZOOM,
  CANVAS_MIN_ZOOM,
  CANVAS_WORLD_HEIGHT,
  CANVAS_WORLD_WIDTH,
  CANVAS_ZOOM_STEP,
  clampViewportToWorld,
  clampZoom,
  computeFitViewport,
  type CanvasBounds,
  type CanvasViewport,
  zoomAtPoint,
} from "@/lib/design/canvas-viewport"
import type { WorkflowNode } from "@/lib/domain/workflow"

export function useCanvasViewport(
  nodes: WorkflowNode[],
  worldBounds: CanvasBounds
) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [viewport, setViewport] = React.useState<CanvasViewport>({
    x: 40,
    y: 40,
    zoom: 1,
  })
  const spacePressedRef = React.useRef(false)
  const panStateRef = React.useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)

  const worldWidth = worldBounds.width
  const worldHeight = worldBounds.height

  const clampPan = React.useCallback(
    (next: CanvasViewport) => {
      const container = containerRef.current
      if (!container) {
        return next
      }

      return clampViewportToWorld(
        next,
        worldWidth,
        worldHeight,
        container.clientWidth,
        container.clientHeight
      )
    },
    [worldHeight, worldWidth]
  )

  const setClampedViewport = React.useCallback(
    (updater: CanvasViewport | ((current: CanvasViewport) => CanvasViewport)) => {
      setViewport((current) => {
        const next =
          typeof updater === "function"
            ? (updater as (current: CanvasViewport) => CanvasViewport)(current)
            : updater
        return clampPan(next)
      })
    },
    [clampPan]
  )

  const fitToContent = React.useCallback(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    setClampedViewport(
      computeFitViewport(
        nodes,
        container.clientWidth,
        container.clientHeight
      )
    )
  }, [nodes, setClampedViewport])

  const getViewportCenterWorldPoint = React.useCallback(() => {
    const container = containerRef.current
    if (!container) {
      return {
        x: CANVAS_WORLD_WIDTH / 2,
        y: CANVAS_WORLD_HEIGHT / 2,
      }
    }

    return {
      x: (container.clientWidth / 2 - viewport.x) / viewport.zoom,
      y: (container.clientHeight / 2 - viewport.y) / viewport.zoom,
    }
  }, [viewport.x, viewport.y, viewport.zoom])

  React.useEffect(() => {
    setClampedViewport((current) => current)
  }, [setClampedViewport, worldHeight, worldWidth])

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" && !event.repeat) {
        spacePressedRef.current = true
      }
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        spacePressedRef.current = false
        panStateRef.current = null
      }
    }

    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
    }
  }, [])

  const handleWheel = React.useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      event.preventDefault()
      const container = containerRef.current
      if (!container) {
        return
      }

      const rect = container.getBoundingClientRect()
      const delta = event.deltaY > 0 ? -CANVAS_ZOOM_STEP : CANVAS_ZOOM_STEP
      setClampedViewport((current) =>
        zoomAtPoint(current, event.clientX, event.clientY, rect, current.zoom + delta)
      )
    },
    [setClampedViewport]
  )

  const startPan = React.useCallback(
    (
      event: React.PointerEvent<HTMLDivElement>,
      options?: { panMode?: boolean }
    ) => {
      const shouldPan =
        options?.panMode ||
        spacePressedRef.current ||
        event.button === 1

      if (!shouldPan || event.button === 2) {
        return false
      }

      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      panStateRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: viewport.x,
        originY: viewport.y,
      }
      return true
    },
    [viewport.x, viewport.y]
  )

  const movePan = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const pan = panStateRef.current
      if (!pan || pan.pointerId !== event.pointerId) {
        return
      }

      setClampedViewport((current) => ({
        ...current,
        x: pan.originX + event.clientX - pan.startX,
        y: pan.originY + event.clientY - pan.startY,
      }))
    },
    [setClampedViewport]
  )

  const endPan = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const pan = panStateRef.current
    if (!pan || pan.pointerId !== event.pointerId) {
      return
    }

    panStateRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }, [])

  const zoomIn = React.useCallback(() => {
    const container = containerRef.current
    if (!container) {
      setClampedViewport((current) => ({
        ...current,
        zoom: clampZoom(current.zoom + CANVAS_ZOOM_STEP),
      }))
      return
    }

    const rect = container.getBoundingClientRect()
    setClampedViewport((current) =>
      zoomAtPoint(
        current,
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
        rect,
        current.zoom + CANVAS_ZOOM_STEP
      )
    )
  }, [setClampedViewport])

  const zoomOut = React.useCallback(() => {
    const container = containerRef.current
    if (!container) {
      setClampedViewport((current) => ({
        ...current,
        zoom: clampZoom(current.zoom - CANVAS_ZOOM_STEP),
      }))
      return
    }

    const rect = container.getBoundingClientRect()
    setClampedViewport((current) =>
      zoomAtPoint(
        current,
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
        rect,
        current.zoom - CANVAS_ZOOM_STEP
      )
    )
  }, [setClampedViewport])

  const resetZoom = React.useCallback(() => {
    setClampedViewport((current) => ({ ...current, zoom: 1 }))
  }, [setClampedViewport])

  const getWorldPoint = React.useCallback(
    (clientX: number, clientY: number) => {
      const container = containerRef.current
      if (!container) {
        return { x: 0, y: 0 }
      }

      const rect = container.getBoundingClientRect()
      return {
        x: (clientX - rect.left - viewport.x) / viewport.zoom,
        y: (clientY - rect.top - viewport.y) / viewport.zoom,
      }
    },
    [viewport]
  )

  return {
    containerRef,
    viewport,
    setViewport: setClampedViewport,
    handleWheel,
    startPan,
    movePan,
    endPan,
    zoomIn,
    zoomOut,
    resetZoom,
    fitToContent,
    getWorldPoint,
    getViewportCenterWorldPoint,
    isSpacePressed: () => spacePressedRef.current,
    minZoom: CANVAS_MIN_ZOOM,
    maxZoom: CANVAS_MAX_ZOOM,
    worldBounds,
  }
}
