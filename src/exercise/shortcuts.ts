type SpaceKeyEvent = Pick<KeyboardEvent, 'code' | 'repeat' | 'defaultPrevented' | 'isComposing' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'preventDefault'>

/** Keep native keyboard behavior on controls; prevent scrolling even on held Space. */
export function handlePhraseShortcut(event: SpaceKeyEvent, blocked: boolean, interactiveTarget: boolean, nextPhrase: () => void): void {
  if (blocked || interactiveTarget || event.defaultPrevented || event.isComposing ||
      event.code !== 'Space' || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
  event.preventDefault()
  if (!event.repeat) nextPhrase()
}
