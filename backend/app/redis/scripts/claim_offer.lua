-- KEYS[1]=offer:{pod_id}  KEYS[2]=drv:{driver_id}  KEYS[3]=offer:declined:{pod_id}
-- ARGV[1]=driver_id ARGV[2]=ttl_s
if redis.call('SISMEMBER', KEYS[3], ARGV[1]) == 1 then return 0 end
local st = redis.call('HGET', KEYS[2], 'status')
if st ~= 'AVAILABLE' and st ~= 'QUEUED_AT_ANCHOR' then return 0 end
local ok = redis.call('SET', KEYS[1], ARGV[1], 'NX', 'EX', tonumber(ARGV[2]))
if not ok then return 0 end
redis.call('HSET', KEYS[2], 'status', 'OFFERED', 'active_pod', KEYS[1])
return 1
