pkill rsync
umount /dev/sda1 
mkdir -p /run/media/alex/Timeshift
mount /dev/sda1 /run/media/alex/Timeshift

rsync -avh -W --delete --progress \
  --exclude='/nix/*' \
  --exclude='/dev/*' \
  --exclude='.qcow2' \
  --exclude='/home/alex/.cache/*' \
  --exclude='/var/tmp/*' \
  --exclude='/proc/*' \
  --exclude='/sys/*' \
  --exclude='/tmp/*' \
  --exclude='/run/*' \
  --exclude='/mnt/*' \
  --exclude='/media/*' \
  --exclude='/home/alex/.local/share/Trash*' \
  --exclude="swapfile" \
  --exclude="/home/alex/.mozilla/" \
  --exclude="lost+found" \
  --exclude="/home/alex/.alex" \
  --exclude=".snapshots" \
  / /run/media/alex/Timeshift

umount /dev/sda1 
