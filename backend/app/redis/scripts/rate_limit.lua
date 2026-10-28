-- KEYS[1]=rl:wa:{wa_id} ARGV[1]=now_ms ARGV[2]=window_ms ARGV[3]=limit ARGV[4]=member(uuid)
redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, tonumber(ARGV[1]) - tonumber(ARGV[2]))
local c = redis.call('ZCARD', KEYS[1])
if c >= tonumber(ARGV[3]) then return 0 end
redis.call('ZADD', KEYS[1], ARGV[1], ARGV[4])
redis.call('PEXPIRE', KEYS[1], tonumber(ARGV[2]) * 2)
return 1
