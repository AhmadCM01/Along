-- KEYS[1]=offer:{pod_id}  KEYS[2]=drv:{driver_id}  KEYS[3]=pod:{pod_id}  KEYS[4]=anchorq:{c:d:a}
-- ARGV[1]=driver_id ARGV[2]=pod_id
local holder = redis.call('GET', KEYS[1])
if holder ~= ARGV[1] then return 0 end
redis.call('DEL', KEYS[1])
redis.call('HSET', KEYS[2], 'status', 'ON_TRIP', 'active_pod', ARGV[2])
redis.call('HSET', KEYS[3], 'state', 'ASSIGNED', 'driver_id', ARGV[1])
if KEYS[4] and KEYS[4] ~= '' then
  redis.call('LREM', KEYS[4], 0, ARGV[1])
end
return 1
