using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class PlayerDetectHit : MonoBehaviour
{

    [SerializeField]
    private HealthPlayer _healthPlayer;

    [SerializeField]
    private Material[] _hitMaterial;


    public delegate void HitDetectEventHandler(PlayerDetectHit player);
    public delegate void ProjectileTextEventHandler(PlayerDetectHit player);

    public static event ProjectileTextEventHandler OnStoneDeath;
    public static event ProjectileTextEventHandler OnPillDeath;
    public static event ProjectileTextEventHandler OnShurikenDeath;
    public static event ProjectileTextEventHandler OnHadoukenDeath;
    public static event ProjectileTextEventHandler OnPizzaDeath;
    public static event ProjectileTextEventHandler OnBarrelDeath;
    public static event ProjectileTextEventHandler OnSockDeath;
    public static event ProjectileTextEventHandler OnDuckDeath;
    public static event ProjectileTextEventHandler OnBombDeath;
    public static event ProjectileTextEventHandler OnMusicDeath;

    /*
     * We will need this delegate to make events for.
     */

    public static event HitDetectEventHandler AddP1Score;
    public static event HitDetectEventHandler AddP2Score;
    public static event HitDetectEventHandler AddP3Score;
    public static event HitDetectEventHandler AddP4Score;

    /*
     * These will be called whenever one of the players
     * Score a point.
     */

    private int _pOne = 1;
    private int _pTwo = 2;
    private int _pThree = 3;
    private int _pFour = 4;

    bool _p1Point;
    bool _p2Point;
    bool _p3Point;
    bool _p4Point;

    bool _sendText;

    void Awake()
    {
        _healthPlayer.OnP1Point += P1Point;
        _healthPlayer.OnP2Point += P2Point;
        _healthPlayer.OnP3Point += P3Point;
        _healthPlayer.OnP4Point += P4Point;

        HealthPlayer.OnNewRound += SendText;
    }

    void OnTriggerEnter2D(Collider2D explosion)
    {
        if(explosion.gameObject.CompareTag(GameTags.bullet))
        {
            if (this.gameObject.CompareTag(GameTags.player))
                StartCoroutine("Flash");

            // POINT HANDLER

            if (explosion.gameObject.GetComponent<BulletNumber>().playernum == _pOne)
            {
                _p1Point = true;
                _p2Point = false;
                _p3Point = false;
                _p4Point = false;

            }

            else if (explosion.gameObject.GetComponent<BulletNumber>().playernum == _pTwo)
            {
                _p1Point = false;
                _p2Point = true;
                _p3Point = false;
                _p4Point = false;

            }

            else if (explosion.gameObject.GetComponent<BulletNumber>().playernum == _pThree)
            {
                _p1Point = false;
                _p2Point = false;
                _p3Point = true;
                _p4Point = false;
            }

            else if (explosion.gameObject.GetComponent<BulletNumber>().playernum == _pFour)
            {
                _p1Point = false;
                _p2Point = false;
                _p3Point = false;
                _p4Point = true;

            }
            // POINT HANDLER

            if (explosion.gameObject.GetComponent<SockExplosion>() != null)
            {
                if (OnSockDeath != null)
                    OnSockDeath(this);
            }
        }
    }

    void OnCollisionEnter2D(Collision2D projectile)
    {

        if(projectile.gameObject.CompareTag(GameTags.bullet))
        {
            if (this.gameObject.CompareTag(GameTags.player))
            StartCoroutine("Flash");
          
            // Hit Feedback

            // POINT HANDLER

            if (projectile.gameObject.GetComponent<BulletNumber>().playernum == _pOne)
            {
                _p1Point = true;
                _p2Point = false;
                _p3Point = false;
                _p4Point = false;

            }

            else if (projectile.gameObject.GetComponent<BulletNumber>().playernum == _pTwo)
            {
                _p1Point = false;
                _p2Point = true;
                _p3Point = false;
                _p4Point = false;

            }

            else if (projectile.gameObject.GetComponent<BulletNumber>().playernum == _pThree)
            {
                _p1Point = false;
                _p2Point = false;
                _p3Point = true;
                _p4Point = false;
            }

            else if (projectile.gameObject.GetComponent<BulletNumber>().playernum == _pFour)
            {
                _p1Point = false;
                _p2Point = false;
                _p3Point = false;
                _p4Point = true;

            }
            // POINT HANDLER

            if (projectile.gameObject.GetComponent<Stone>() != null)
            {
                if (OnStoneDeath != null)
                    OnStoneDeath(this);
            }

            else if (projectile.gameObject.GetComponent<Pill>() != null)
            {
                if (OnPillDeath != null)
                    OnPillDeath(this);
            }

            else if (projectile.gameObject.GetComponent<Shuriken>() != null)
            {
                if (OnShurikenDeath != null)
                    OnShurikenDeath(this);
            }


            else if (projectile.gameObject.GetComponent<Hadouken>() != null)
            {
                if (OnHadoukenDeath != null)
                    OnHadoukenDeath(this);
            }

            else if (projectile.gameObject.GetComponent<Pizza>() != null)
            {
                if (OnPizzaDeath != null)
                    OnPizzaDeath(this);
            }

            else if (projectile.gameObject.GetComponent<Barrel>() != null)
            {
                if (OnBarrelDeath != null)
                    OnBarrelDeath(this);
            }

            

            else if (projectile.gameObject.GetComponent<DuckExplosion>() != null)
            {
                if (OnDuckDeath != null)
                    OnDuckDeath(this);
            }

          

            else if (projectile.gameObject.GetComponent<MusicNote>() != null)
            {
                if (OnMusicDeath != null)
                    OnMusicDeath(this);
            }


        }
    }

    void P1Point(HealthPlayer player)
    {
        if (_p1Point)
        {
            if (AddP1Score != null)
            {
                AddP1Score(this);
            }

            _p1Point = false;
        }
    }

    void P2Point(HealthPlayer player)
    {
        if (_p2Point)
        {
            if (AddP2Score != null)
            {
                AddP2Score(this);
            }

            _p2Point = false;
        }
    }

    void P3Point(HealthPlayer player)
    {
        if (_p3Point)
        {
            if (AddP3Score != null)
            {
                AddP3Score(this);
            }

            _p3Point = false;
        }
    }

    void P4Point(HealthPlayer player)
    {
        if (_p4Point)
        {
            if (AddP4Score != null)
            {
                AddP4Score(this);
            }

            _p4Point = false;
        }
    }

    void SendText(HealthPlayer player)
    {
        _sendText = true;
    }

    IEnumerator Flash()
    {
        this.GetComponent<SpriteRenderer>().material = _hitMaterial[1];
            yield return new WaitForSeconds(.025f);
            this.GetComponent<SpriteRenderer>().material = _hitMaterial[0];
            yield return new WaitForSeconds(.05f);
            this.GetComponent<SpriteRenderer>().material = _hitMaterial[1];
            yield return new WaitForSeconds(.025f);
            this.GetComponent<SpriteRenderer>().material = _hitMaterial[0];
    }
}

