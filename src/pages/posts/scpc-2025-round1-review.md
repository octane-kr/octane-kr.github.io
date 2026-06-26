---
title: "SCPC 2025 1차 후기"
publishedAt: 2025-07-13T13:42:00+09:00
updatedAt: 2026-05-07T02:40:00+09:00
category: "PS"
subcategory: "Contests"
layout: ../../layouts/PostLayout.astro
---

## 1. 거스름돈

$500$원짜리 물건을 파는데 각 고객이 $500$원, $1000$원, $5000$원 중 하나를 지불하고, 잘 거슬러 주는 문제이다. 예를 들어 고객이 $5000$원을 지불했는데 수중에 $4500$원이 없으면 세상이 망한다. 케이스워크를 잘 짜면 된다.

```cpp
#include<bits/stdc++.h>
using namespace std;

int t, n;
int arr[100005];
int cnt[5];

int main(){
    scanf("%d", &t);
    for(int _=1;_<=t;_++){
        printf("Case #%d\n", _);
        scanf("%d", &n);
        for(int i=1;i<=n;i++) scanf("%d", &arr[i]);
        for(int i=1;i<=3;i++) cnt[i] = 0;
        int res = n;
        for(int i=1;i<=n;i++){
            if(arr[i]==500) cnt[1]++;
            if(arr[i]==1000){
                if(cnt[1]==0){
                    res = i-1;
                    break;
                }
                else{
                    cnt[1]--;
                    cnt[2]++;
                }
            }
            if(arr[i]==5000){
                int u = min(4, cnt[2]);
                if(cnt[1]<(4500-u*1000)/500){
                    res = i-1;
                    break;
                }
                else{
                    cnt[1] -= (4500-u*1000)/500;
                    cnt[2] -= u;
                    cnt[3]++;
                }
            }
        }
        printf("%d\n", res);
    }
}
```

## 2. 폭탄

수직선 위의 $0$~$l$ 사이에 놓인 폭탄들을 순서대로 $0$ 또는 $l$에 잘 가져다놓는 문제이다. 이때 이동하는 거리를 최소화해야 한다. $i$번째 폭탄까지 처리했을 때 $0$에서 끝나는 케이스와 $l$에서 끝나는 케이스를 dp로 관리하면 된다.

```cpp
#include<bits/stdc++.h>
using namespace std;
typedef long long ll;

int t, n;
ll l;
ll arr[100005];
ll dp[100005][5];

int main(){
    scanf("%d", &t);
    for(int _=1;_<=t;_++){
        printf("Case #%d\n", _);
        scanf("%d %lld", &n, &l);
        for(int i=1;i<=n;i++) scanf("%lld", &arr[i]);
        dp[0][1] = l;
        dp[0][0] = 0;
        for(int i=0;i<n;i++){
            dp[i+1][0] = min(dp[i][0]+2*arr[i+1], dp[i][1]+l);
            dp[i+1][1] = min(dp[i][0]+l, dp[i][1]+2*(l-arr[i+1]));
        }
        printf("%lld\n", min(dp[n][0], dp[n][1]));
    }
}
```

## 3. 십진수

$N$ 이하의 자연수 중 각 자리가 $0, 1, 2$로만 이루어진 수의 개수를 출력하는 문제다. 적당히 재귀를 짜면 된다.

```cpp
#include<bits/stdc++.h>
using namespace std;
typedef long long ll;
const ll mod = 1000000007;

int t, n;
ll tp[100005];
char s[100005];

ll calc(int idx){
    if(idx==n-1) return min(s[idx]-'0'+1, 3);
    if(s[idx]>='3') return tp[n-idx];
    return ((s[idx]-'0')*tp[n-idx-1]%mod+calc(idx+1))%mod;
}

int main(){
    tp[0] = 1;
    for(int i=1;i<=100000;i++) tp[i] = tp[i-1]*3%mod;
    scanf("%d", &t);
    for(int _=1;_<=t;_++){
        printf("Case #%d\n", _);
        scanf("%s", s);
        n = strlen(s);
        printf("%lld\n", (calc(0)+mod-1)%mod);
    }
}
```

## 4. 상점

수직선 위에 $R$명의 빨간 고객과 $B$명의 파란 고객이 있을 때 각각을 수직선 위의 $R+1$개의 빨간 상점과 $B-1$개의 파란 상점에 보내는 문제다. 단 빨간 고객은 빨간 상점에만 갈 수 있고, 각 고객의 이동 거리의 합을 최소화해야 한다.

빨간 고객이 가지 않을 빨간 상점을 고정하면 누가 어느 상점에 갈지는 정렬 순서에 따라 유일하게 결정된다. 이때 어떤 파란 고객이 빨간 상점에 가게 되는지 이분 탐색으로 구하고, 이동 거리의 합은 미리 정렬해서 전처리한 누적합을 잘 사용하면 빠르게 구할 수 있다.

```cpp
#include<bits/stdc++.h>
using namespace std;
typedef long long ll;
const ll mod = 1000000007;

int t, n, r;
ll bh[200005], rh[200005], bs[200005], rs[200005];
ll rlsm[200005], rrsm[200005], blsm[200005], brsm[200005];

int main(){
    scanf("%d", &t);
    for(int _=1;_<=t;_++){
        printf("Case #%d\n", _);
        scanf("%d %d", &n, &r);
        for(int i=1;i<=n-r;i++) scanf("%lld", &bh[i]);
        for(int i=1;i<=r;i++) scanf("%lld", &rh[i]);
        for(int i=1;i<=n-r-1;i++) scanf("%lld", &bs[i]);
        for(int i=1;i<=r+1;i++) scanf("%lld", &rs[i]);
        sort(bh+1, bh+n-r+1);
        sort(rh+1, rh+r+1);
        sort(bs+1, bs+n-r);
        sort(rs+1, rs+r+2);
        rlsm[0] = 0;
        for(int i=1;i<=r;i++) rlsm[i] = rlsm[i-1]+abs(rh[i]-rs[i]);
        rrsm[r+1] = 0;
        for(int i=r;i>=1;i--) rrsm[i] = rrsm[i+1]+abs(rh[i]-rs[i+1]);
        blsm[0] = 0;
        for(int i=1;i<=n-r-1;i++) blsm[i] = blsm[i-1]+abs(bh[i]-bs[i]);
        brsm[n-r] = 0;
        for(int i=n-r-1;i>=1;i--) brsm[i] = brsm[i+1]+abs(bh[i+1]-bs[i]);
        ll res = 10000000000000000;
        for(int i=1;i<=r+1;i++){
            ll tmp = rlsm[i-1]+rrsm[i];
            int s = 1;
            int e = n-r;
            while(s^e){
                int m = (s+e)>>1;
                if(bs[m]<=rs[i]) s = m+1;
                else e = m;
            }
            tmp += blsm[s-1]+abs(rs[i]-bh[s])+brsm[s];
            res = min(res, tmp);
        }
        printf("%lld\n", res);
    }
}
```

## 5. MST

연결 비단순 가중치 그래프의 스패닝 트리 중 간선의 최소 가중치와 최대 가중치의 차이가 최대이며 간선의 가중치 합이 최소가 되는 것을 구하는 문제이다. 결과의 최소 가중치 간선을 $a$, 최대 가중치 간선을 $b$라고 하면 $a$와 $b$를 포함하는 스패닝 트리 중 가중치 합이 최소인 것은 그 두 간선을 넣은 상태에서 최소 스패닝 트리를 구하면 된다.

조금 더 생각해보면 그냥 최소 스패닝 트리 $T$를 구하는 과정에서 $a$는 알아서 들어갈 것이고, $b$가 못 들어가게 막는 순간이 존재할 것인데 그것만 $b$로 대체하면 된다. 즉 대체되는 간선은 $b$의 endpoint $u, v$와 $T$ 위의 $(u, v)$-path $p$에 대해 $p$에서 가장 가중치가 큰 간선이다.

간선끼리 가중치가 같을 수도 있고 단순 그래프도 아니기 때문에 그냥 $T$를 구해 두고 다른 모든 간선에 대해 저것을 구해주면 분명 그중 답이 있다는 느낌으로 짜면 된다.

```cpp
#pragma GCC optimize("O3")
#pragma GCC optimize("ofast")
#pragma GCC optimize("unroll-loops")

#include<bits/stdc++.h>
using namespace std;
typedef long long ll;
struct edge{
    int u, v;
    ll w;
    edge(){}
    edge(int u, int v, ll w): u(u), v(v), w(w){}
    bool operator<(const edge &other)const{return w<other.w;}
};
typedef pair<ll, ll> pi;

int t, n, m;
edge arr[200005];
int prv[200005];
vector<pi> adj[200005];
pi spa[200005][25];
int dep[200005];

int fnd(int a){
    if(prv[a]==0) return a;
    return prv[a] = fnd(prv[a]);
}

void unin(int a, int b){
    if(fnd(a)==fnd(b)) return;
    prv[fnd(a)] = fnd(b);
}

void dfs(int node){
    for(auto p: adj[node]){
        if(spa[p.first][0].first) continue;
        spa[p.first][0] = pi(node, p.second);
        dep[p.first] = dep[node]+1;
        dfs(p.first);
    }
}

int main(){
    scanf("%d", &t);
    for(int _=1;_<=t;_++){
        printf("Case #%d\n", _);
        scanf("%d %d", &n, &m);
        for(int i=0;i<m;i++) scanf("%d %d %lld", &arr[i].u, &arr[i].v, &arr[i].w);
        sort(arr, arr+m);
        for(int i=1;i<=n;i++){
            prv[i] = 0;
            adj[i].clear();
            for(int j=0;j<20;j++) spa[i][j] = pi(0, 0);
        }
        vector<ll> vec;
        for(int i=0;i<m;i++){
            if(fnd(arr[i].u)==fnd(arr[i].v)) continue;
            unin(arr[i].u, arr[i].v);
            adj[arr[i].u].push_back(pi(arr[i].v, arr[i].w));
            adj[arr[i].v].push_back(pi(arr[i].u, arr[i].w));
            vec.push_back(arr[i].w);
        }
        spa[1][0] = pi(1, 0);
        dfs(1);
        for(int i=1;i<20;i++){
            for(int j=1;j<=n;j++){
                pi p = spa[j][i-1];
                pi q = spa[p.first][i-1];
                spa[j][i] = pi(q.first, max(p.second, q.second));
            }
        }
        sort(vec.begin(), vec.end());
        ll sm = 0;
        for(auto k: vec) sm += k;
        pi res = pi(vec.back()-vec[0], sm);
        if(vec.size()==1){
            printf("%lld %lld\n", res.first, res.second);
            continue;
        }
        if(vec[0]==vec[1]){
            for(int i=0;i<m;i++){
                int u = arr[i].u;
                int v = arr[i].v;
                if(dep[u]<dep[v]) swap(u, v);
                ll mx = 1;
                for(int j=19;j>=0;j--){
                    if(dep[spa[u][j].first]<dep[v]) continue;
                    mx = max(mx, spa[u][j].second);
                    u = spa[u][j].first;
                }
                for(int j=19;j>=0;j--){
                    if(spa[u][j].first==spa[v][j].first) continue;
                    mx = max(mx, spa[u][j].second);
                    mx = max(mx, spa[v][j].second);
                    u = spa[u][j].first;
                    v = spa[v][j].first;
                }
                if(u!=v){
                    mx = max(mx, spa[u][0].second);
                    mx = max(mx, spa[v][0].second);
                    u = spa[u][0].first;
                    v = spa[v][0].first;
                }
                if(res.first==arr[i].w-vec[0]) res = min(res, pi(arr[i].w-vec[0], sm-mx+arr[i].w));
                else res = max(res, pi(arr[i].w-vec[0], sm-mx+arr[i].w));
            }

        }
        else{
            for(int i=0;i<m;i++){
                int u = arr[i].u;
                int v = arr[i].v;
                if(dep[u]<dep[v]) swap(u, v);
                ll mx = 1;
                for(int j=19;j>=0;j--){
                    if(dep[spa[u][j].first]<dep[v]) continue;
                    mx = max(mx, spa[u][j].second);
                    u = spa[u][j].first;
                }
                for(int j=19;j>=0;j--){
                    if(spa[u][j].first==spa[v][j].first) continue;
                    mx = max(mx, spa[u][j].second);
                    mx = max(mx, spa[v][j].second);
                    u = spa[u][j].first;
                    v = spa[v][j].first;
                }
                if(u!=v){
                    mx = max(mx, spa[u][0].second);
                    mx = max(mx, spa[v][0].second);
                    u = spa[u][0].first;
                    v = spa[v][0].first;
                }
                if(mx!=vec[0]){
                    if(res.first==arr[i].w-vec[0]) res = min(res, pi(arr[i].w-vec[0], sm-mx+arr[i].w));
                    else res = max(res, pi(arr[i].w-vec[0], sm-mx+arr[i].w));
                }
                else{
                    if(res.first==arr[i].w-vec[1]) res = min(res, pi(arr[i].w-vec[1], sm-mx+arr[i].w));
                    else res = max(res, pi(arr[i].w-vec[1], sm-mx+arr[i].w));
                }
            }
        }
        printf("%lld %lld\n", res.first, res.second);
    }
}
```

## 후기

작년까지는 1차 예선도 다 풀지는 못했던 것 같은데 요즘 좀 열심히 했더니 다 슥삭할 수 있었다. 5번은 트리의 구간 쿼리 짜기 싫어서 일부 간선만 어떻게 잘 보는 풀이 짜다가 9틀을 하고, 다음날 일어나서 UCPC 예선 직전에 정직한 풀이 짜서 AC를 받았다. 2차 예선과 본선에서도 풀 수 있는 것만 정확하게 잘 풀면 좋겠다.
