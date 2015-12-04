ffmpeg -i laplage.mp4 -vf "crop=320:240" -c:v libx264 -strict -2 laplage_crop.mp4
ffmpeg -i calculatedmovements.mp4 -i laplage_crop.mp4 -filter_complex "[0:v:0] [0:a:0] [1:v:0] [1:a:0] concat=n=2:v=1:a=1 [v] [a]" -map "[v]" -map "[a]" -c:v libx264 -strict -2 output.mp4
