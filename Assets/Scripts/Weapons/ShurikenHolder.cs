using UnityEngine;
using System.Collections;

public class ShurikenHolder : MonoBehaviour, IWeapon
{
    [SerializeField]
    private Shuriken shuriken;
    private PlayerFlip flip;


    void Awake()
    {
        flip = GetComponent<PlayerFlip>();
    }

    public void Shoot()
    {
        if (flip.facingRight)
        {
            Shuriken currShuriken = Instantiate(shuriken, new Vector2(transform.position.x + 1, transform.position.y), shuriken.transform.rotation) as Shuriken;
            currShuriken.GetComponent<Shuriken>().ShootRight();
        }
        else
        {
            Shuriken currShuriken = Instantiate(shuriken, new Vector2(transform.position.x - 1, transform.position.y), Quaternion.Inverse(shuriken.transform.rotation)) as Shuriken;
            currShuriken.GetComponent<Shuriken>().ShootLeft();
        }
    }
}
