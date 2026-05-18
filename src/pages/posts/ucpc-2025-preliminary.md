---
layout: ../../layouts/PostLayout.astro
title: "UCPC 2025 예선 후기"
date: 2025-07-13
category: "PS"
subcategory: "Contests"
---

ICPC 팀원인 abra_stone이 전대프연 부회장으로 끌려가서 팀이 터졌다. gs20036도 고등학교 친구들과 팀 한다고 사라져서 런 친구들이랑 직전에 팀 꾸려서 신청했다. juneharold는 코포 퍼플도 찍었던 고수고, dylan0301은 대충 요상한 수학 문제 나오면 먹일 역할로 팀을 구성했다.

## 00:02

A를 읽었다. 전통적인 브론즈 문제였다. 바로 짜서 AC.

```cpp
#include<bits/stdc++.h>
using namespace std;

int x;

int main(){
    int tmp = 0;
    for(int i=0;i<4;i++){
        scanf("%d", &x);
        tmp += x;
    }
    if(tmp+300<=1800) printf("Yes");
    else printf("No");
}
```

## 00:05

B를 읽었다. 한 칸이 0이면 답은 총합과 같았고, 한 칸을 0으로 만들 때까지는 2씩 줄어든다. 바로 짜서 AC.

```cpp
#include<bits/stdc++.h>
using namespace std;
typedef long long ll;

int n, m;
ll board[1005][1005];

int main(){
    scanf("%d %d", &n, &m);
    ll mn = 1000000000;
    ll sm = 0;
    for(int i=0;i<n;i++){
        for(int j=0;j<m;j++){
            scanf("%lld", &board[i][j]);
            mn = min(mn, board[i][j]);
            sm += board[i][j];
        }
    }
    printf("%lld\n", sm-mn);
}
```

## 00:17

E가 풀리길래 읽었다. 각 방음벽은 대충 로그 횟수만큼 사용 가능하니까 나이브를 짜서 AC.

```cpp
#include<bits/stdc++.h>
using namespace std;
typedef long long ll;

int n, q, a, b, c;
ll arr[200005];

int main(){
    scanf("%d", &n);
    for(int i=1;i<=n;i++) scanf("%lld", &arr[i]);
    scanf("%d", &q);
    while(q--){
        scanf("%d", &a);
        if(a==1){
            scanf("%d %d", &b, &c);
            ll tmp = c;
            for(int i=b;i>=1;i--){
                if(tmp==0) break;
                ll u = min(tmp, arr[i]);
                arr[i] += u;
                tmp -= u;
            }
            tmp = c;
            for(int i=b+1;i<=n;i++){
                if(tmp==0) break;
                ll u = min(tmp, arr[i]);
                arr[i] += u;
                tmp -= u;
            }
        }
        if(a==2){
            scanf("%d", &b);
            printf("%lld\n", arr[b]);
        }
    }
}
```

## 00:18-00:23

juneharold가 I에서 WA를 한 번 받고 AC.

## 00:31

D가 풀리길래 읽었다. 대충 빈 공간 크기 구해 놓고 이분탐색 + 누적 합 하면 되는 문제. 바로 짜서 AC.

```cpp
#include<bits/stdc++.h>
using namespace std;
typedef pair<int, int> pi;

int n, h, x, y, q;
vector<pi> vec;
int sm[200005];

int main(){
    scanf("%d %d", &n, &h);
    while(n--){
        scanf("%d %d", &x, &y);
        vec.push_back(pi(x, y));
    }
    sort(vec.begin(), vec.end());
    int prv = 0;
    vector<int> val;
    for(auto p: vec){
        if(p.first>prv+1) val.push_back(p.first-prv-1);
        prv = max(prv, p.second);
    }
    if(prv<h) val.push_back(h-prv);
    sort(val.begin(), val.end());
    if(val.empty()){
        scanf("%d", &q);
        while(q--){
            scanf("%d", &x);
            printf("0\n");
        }
        return 0;
    }
    for(int i=val.size()-1;i>=0;i--) sm[i] = sm[i+1]+val[i];
    scanf("%d", &q);
    while(q--){
        scanf("%d", &x);
        if(val.back()<x){
            printf("0\n");
            continue;
        }
        int s = 0;
        int e = val.size()-1;
        while(s^e){
            int m = (s+e)>>1;
            if(val[m]>=x) e = m;
            else s = m+1;
        }
        printf("%d\n", sm[s]-(x-1)*(val.size()-s));
    }
}
```

## 01:44

이것저것 읽다가 dylan0301이 H 코드를 힘들게 짜고 있길래 대신 받아와서 구현했다. 예제가 안 나와서 보니까 케이스워크를 조금 더 해줬어야 했다. 친절한 예제에게 감사하며 AC.

```cpp
#include<bits/stdc++.h>
using namespace std;
typedef long long ll;
const ll mod = 1000000007;

int n, x, y;
ll fac[1000005], caf[1000005];

ll pw(ll a, ll b){
    ll res = 1;
    while(b){
        if(b%2) res = res*a%mod;
        a = a*a%mod;
        b /= 2;
    }
    return res;
}

ll inv(ll a){return pw(a, mod-2);}
ll comb(ll a, ll b){return fac[a]*caf[b]%mod*caf[a-b]%mod;}

ll f(ll a){
    if(a==1) return 1;
    return pw(2, a-2);
}

ll g(int a, int b){
    if(a==1) return 1;
    if(b==0||b==a) return 0;
    if(b==1||b==a-1) return 1;
    return comb(a-2, b-1);
}

int main(){
    fac[0] = 1;
    for(int i=1;i<=1000000;i++) fac[i] = fac[i-1]*i%mod;
    caf[1000000] = inv(fac[1000000]);
    for(int i=1000000;i>0;i--) caf[i-1] = caf[i]*i%mod;
    scanf("%d", &n);
    scanf("%d %d", &x, &y);
    if(x>y) swap(x, y);
    if(x==1){
        if(y==2||y==n) printf("%lld", f(n-1));
        else printf("0");
    }
    else if(y==x+1){
        ll res = 0;
        for(int i=1;i<x;i++){
            res = (res+g(n-y+i+1, n-y+1)*f(x-i)%mod)%mod;
        }
        for(int i=y+1;i<=n+1;i++){
            res = (res+g(n+x-i+1, x-1)*f(i-y)%mod)%mod;
        }
        printf("%lld", res);
    }
    else printf("%lld", g(n-y+x, x-1)*f(y-x)%mod*2%mod);
}
```

## 02:21-02:39

슼보 보니까 하나만 더 풀면 될 것 같아 다같이 C를 잡았다. 대충 $[s, e]$라는 쿼리가 주어지면 각 구간 $[l, r]$에 대해 $\max(0, r-s, e-l)$을 구하는 문제였다. $r-s$와 $e-l$의 대소는 $r+l$과 $s+e$의 대소와 같으므로 구간의 양 끝 점의 합 기준으로 잘 정렬을 하면 되는데, 음수로 떨어지는 걸 어떻게 해야 할지 고민이었다.

juneharold가 오프라인 쿼리를 얘기해서, 한 정렬 기준으로 한쪽에 있는 것만 보면서 나머지 한 정렬 기준으로 쿼리를 날리는 건 typical한 세그 문제였다는 걸 그때서야 깨달았다. juneharold와 내가 각자 코드를 짜기 시작해서 juneharold가 4WA.

## 02:40-02:52

나도 C 첫 제출을 했으나 런타임에러를 받고, 배열 범위를 수정했음에도 WA. 중간에 귀찮아서 대충 잡은 세그 쿼리 범위를 대충 잡으면 안됐었다. 고쳐서 AC.

```cpp
#include<bits/stdc++.h>
using namespace std;
typedef long long ll;
struct interval{
    ll l, r;
    interval(){}
    interval(ll l, ll r): l(l), r(r){}
};
struct query{
    ll s, e;
    int idx;
    query(){}
    query(ll s, ll e, int idx): s(s), e(e), idx(idx){}
};
typedef pair<ll, ll> pi;

int n, q;
interval arr[250005];
query qrr[250005];
ll res[250005];
pi ltree[4000005], rtree[4000005];

void lupdate(int node, int s, int e, int l, ll u){
    if(e<l||l<s) return;
    if(s==e){
        ltree[node].first += u*l;
        ltree[node].second += u;
        return;
    }
    int m = (s+e)>>1;
    lupdate(node<<1, s, m, l, u);
    lupdate(node<<1|1, m+1, e, l, u);
    ltree[node] = pi(ltree[node<<1].first+ltree[node<<1|1].first, ltree[node<<1].second+ltree[node<<1|1].second);
}

pi lquery(int node, int s, int e, int l, int r){
    if(e<l||r<s) return pi(0, 0);
    if(l<=s&&e<=r) return ltree[node];
    int m = (s+e)>>1;
    pi p1 = lquery(node<<1, s, m, l, r);
    pi p2 = lquery(node<<1|1, m+1, e, l, r);
    return pi(p1.first+p2.first, p1.second+p2.second);
}

void rupdate(int node, int s, int e, int l, ll u){
    if(e<l||l<s) return;
    if(s==e){
        rtree[node].first += u*l;
        rtree[node].second += u;
        return;
    }
    int m = (s+e)>>1;
    rupdate(node<<1, s, m, l, u);
    rupdate(node<<1|1, m+1, e, l, u);
    rtree[node] = pi(rtree[node<<1].first+rtree[node<<1|1].first, rtree[node<<1].second+rtree[node<<1|1].second);
}

pi rquery(int node, int s, int e, int l, int r){
    if(e<l||r<s) return pi(0, 0);
    if(l<=s&&e<=r) return rtree[node];
    int m = (s+e)>>1;
    pi p1 = rquery(node<<1, s, m, l, r);
    pi p2 = rquery(node<<1|1, m+1, e, l, r);
    return pi(p1.first+p2.first, p1.second+p2.second);
}

int main(){
    scanf("%d %d", &n, &q);
    for(int i=0;i<n;i++) scanf("%lld %lld", &arr[i].l, &arr[i].r);
    for(int i=0;i<q;i++){
        scanf("%lld %lld", &qrr[i].s, &qrr[i].e);
        qrr[i].idx = i;
    }
    sort(arr, arr+n, [&](interval a, interval b){return a.l+a.r<b.l+b.r;});
    sort(qrr, qrr+q, [&](query a, query b){return a.s+a.e<b.s+b.e;});
    int idx = 0;
    for(int i=0;i<q;i++){
        while(idx<n&&arr[idx].l+arr[idx].r<qrr[i].s+qrr[i].e){
            lupdate(1, 0, 1000001, arr[idx].r, arr[idx].r-arr[idx].l);
            idx++;
        }
        pi p = lquery(1, 0, 1000001, qrr[i].s, 1000000);
        res[qrr[i].idx] += p.first-p.second*qrr[i].s;
    }
    idx = n-1;
    for(int i=q-1;i>=0;i--){
        while(idx>=0&&arr[idx].l+arr[idx].r>=qrr[i].s+qrr[i].e){
            rupdate(1, 0, 1000001, arr[idx].l, arr[idx].r-arr[idx].l);
            idx--;
        }
        pi p = rquery(1, 0, 1000001, 1, qrr[i].e);
        res[qrr[i].idx] += p.second*qrr[i].e-p.first;
    }
    for(int i=0;i<q;i++) printf("%lld\n", 2*res[i]);
}
```

39등으로 본선은 널널하게 진출했다. 예선은 3컴이기도 해서 병렬로 플레를 슥슥 밀어버리는 다른 팀들에 비해 후반에 힘이 좀 빠진 것 같은데, 본선에서는 dylan0301에게 잘 맞는 문제를 주고 juneharold와 하나씩 플레를 잘 미는 것을 목표로 하면 만족스러운 결과가 나오지 않을까 싶다.
