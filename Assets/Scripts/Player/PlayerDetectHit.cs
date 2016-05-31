using UnityEngine;
using System.Collections;

public class PlayerDetectHit : MonoBehaviour
{

    public delegate void DetectEventHandler(PlayerDetectHit player);

    public static event DetectEventHandler AddP1Score;
    public static event DetectEventHandler AddP2Score;
    public static event DetectEventHandler AddP3Score;
    public static event DetectEventHandler AddP4Score;


    [SerializeField]
    private HealthPlayer _healthPlayer;

    private int _pOne = 1;
    private int _pTwo = 2;
    private int _pThree = 3;
    private int _pFour = 4;

    bool _p1Point;
    bool _p2Point;
    bool _p3Point;
    bool _p4Point;


    void Awake()
    {
        _healthPlayer.OnP1Point += P1Point;
        _healthPlayer.OnP2Point += P2Point;
        _healthPlayer.OnP3Point += P3Point;
        _healthPlayer.OnP4Point += P4Point;
    }

    void OnCollisionEnter2D(Collision2D coll)
    {

        if(coll.gameObject.tag == "Bullet")
        {
            if (coll.gameObject.GetComponent<Stone>().playernum == _pOne)
            {
                _p1Point = true;
                _p2Point = false;
                _p3Point = false;
                _p4Point = false;

            }

            else if (coll.gameObject.GetComponent<Stone>().playernum == _pTwo)
            {
                _p1Point = false;
                _p2Point = true;
                _p3Point = false;
                _p4Point = false;

            }

            else if (coll.gameObject.GetComponent<Stone>().playernum == _pThree)
            {
                _p1Point = false;
                _p2Point = false;
                _p3Point = true;
                _p4Point = false;

            }

            else if (coll.gameObject.GetComponent<Stone>().playernum == _pFour)
            {
                _p1Point = false;
                _p2Point = false;
                _p3Point = false;
                _p4Point = true;

            }
        }
        

        /*
        for (int i = 0; i < _playerCollision._ignoredColl.Length; i++)
        {

        }
         */
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
}

