using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class StoneHolder : MonoBehaviour, IWeapon
{
    [SerializeField] private Stone stone;
    private PlayerFlip flip;
    

    void Awake()
    {
        flip = GetComponent<PlayerFlip>();
    }

    public void Shoot()
    {
        if (flip.facingRight)
        {
            Stone currStone = Instantiate(stone, new Vector2(transform.position.x + 1, transform.position.y), stone.transform.rotation) as Stone;
            currStone.GetComponent<Stone>().ShootRight();
        }
        else
        {
            Stone currStone = Instantiate(stone, new Vector2(transform.position.x - 1, transform.position.y), Quaternion.Inverse(stone.transform.rotation)) as Stone;
            currStone.GetComponent<Stone>().ShootLeft();
        }
    }
}
