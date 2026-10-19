// Camera ka frame stage mein "cover" ki tarah bharta hai (object-cover): stage poora bharta hai
// aur frame ka jo hissa fazool ho wo kat jata hai.
// Ye function frame ke point (0 se 1) ko stage ke point (0 se 1) mein badalta hai,
// taake ungli, cursor aur skeleton bilkul wahin rahein jahan haath video mein dikhta hai.
export function coverMap(p, videoAspect, stageAspect) {
  if (!videoAspect || !stageAspect) return p;

  if (videoAspect > stageAspect) {
    // Frame zyada chaura hai: dono kinaron se kat'ta hai.
    const visible = stageAspect / videoAspect; // chaurai ka kitna hissa dikhta hai
    return { x: (p.x - (1 - visible) / 2) / visible, y: p.y };
  }

  // Frame zyada tall hai: upar neeche se kat'ta hai.
  const visible = videoAspect / stageAspect; // ooncha'i ka kitna hissa dikhta hai
  return { x: p.x, y: (p.y - (1 - visible) / 2) / visible };
}